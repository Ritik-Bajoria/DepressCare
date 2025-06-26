const db = require('../models');
const { User, Psychiatrist, Appointment, DepressionForm, Prescription, Recommendation } = db;
const { Op } = require('sequelize');
const generateMeetingLink = require('../utils/generateMeetingLink');

/**
 * @desc Search psychiatrists based on filters
 * @route GET /patients/psychiatrists
 * @access Private (Patient)
 */
const searchPsychiatrists = async (req, res, next) => {
  try {
    const { search, specialization, availability } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { '$User.full_name$': { [Op.iLike]: `%${search}%` } },
        { specialization: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (specialization) {
      where.specialization = specialization;
    }
    if (availability) {
      where.availability = availability;
    }

    const psychiatrists = await Psychiatrist.findAll({
      where,
      include: [{
        model: User,
        as: 'User',
        attributes: ['user_id', 'full_name', 'profile_picture']
      }],
      attributes: ['psychiatrist_id', 'specialization', 'years_of_experience', 'bio', 'availability']
    });

    res.json({
      success: true,
      count: psychiatrists.length,
      data: psychiatrists
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Book a new appointment
 * @route POST /patients/appointments
 * @access Private (Patient)
 */
const bookAppointment = async (req, res, next) => {
  try {
    const { psychiatrist_id, scheduled_time } = req.body;
    const patient_id = req.user.user_id;

    // Check if psychiatrist exists
    const psychiatrist = await Psychiatrist.findByPk(psychiatrist_id);
    if (!psychiatrist) {
      return res.status(404).json({ success: false, message: 'Psychiatrist not found' });
    }

    // Check if time slot is available
    const existingAppointment = await Appointment.findOne({
      where: {
        psychiatrist_id,
        scheduled_time,
        status: 'Scheduled'
      }
    });

    if (existingAppointment) {
      return res.status(400).json({ success: false, message: 'Time slot not available' });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patient_id,
      psychiatrist_id,
      scheduled_time,
      status: 'Scheduled',
      meeting_link: generateMeetingLink(),
      created_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Cancel an appointment
 * @route PATCH /patients/appointments/:id/cancel
 * @access Private (Patient)
 */
const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient_id = req.user.user_id;

    const appointment = await Appointment.findOne({
      where: {
        appointment_id: id,
        patient_id,
        status: 'Scheduled'
      }
    });

    if (!appointment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Appointment not found or already cancelled/completed' 
      });
    }

    await appointment.update({ status: 'Cancelled' });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get appointment history
 * @route GET /patients/appointments
 * @access Private (Patient)
 */
const getAppointmentHistory = async (req, res, next) => {
  try {
    const patient_id = req.user.user_id;
    const { status, from, to } = req.query;

    const where = { patient_id };
    if (status) where.status = status;
    if (from && to) {
      where.scheduled_time = {
        [Op.between]: [new Date(from), new Date(to)]
      };
    }

    const appointments = await Appointment.findAll({
      where,
      include: [{
        model: User,
        as: 'Psychiatrist',
        attributes: ['full_name', 'profile_picture'],
        include: [{
          model: Psychiatrist,
          as: 'Psychiatrist',
          attributes: ['specialization']
        }]
      }],
      order: [['scheduled_time', 'DESC']]
    });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Submit depression self-assessment form
 * @route POST /patients/assessments
 * @access Private (Patient)
 */
const submitAssessment = async (req, res, next) => {
  try {
    const patient_id = req.user.user_id;
    const { responses, notes } = req.body;

    // Calculate total score
    const total_score = responses.reduce((sum, response) => sum + response.score, 0);

    // Create form and responses in transaction
    await db.sequelize.transaction(async (t) => {
      const form = await DepressionForm.create({
        patient_id,
        total_score,
        notes,
        filled_at: new Date()
      }, { transaction: t });

      const formResponses = responses.map(response => ({
        form_id: form.form_id,
        question_id: response.question_id,
        response_value: response.score
      }));

      await db.FormResponse.bulkCreate(formResponses, { transaction: t });
    });

    res.status(201).json({
      success: true,
      message: 'Assessment submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get prescriptions
 * @route GET /patients/prescriptions
 * @access Private (Patient)
 */
const getPrescriptions = async (req, res, next) => {
  try {
    const patient_id = req.user.user_id;

    const prescriptions = await Prescription.findAll({
      include: [{
        model: Appointment,
        where: { patient_id },
        attributes: ['scheduled_time']
      }],
      order: [['uploaded_at', 'DESC']]
    });

    res.json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get recommendations
 * @route GET /patients/recommendations
 * @access Private (Patient)
 */
const getRecommendations = async (req, res, next) => {
  try {
    const patient_id = req.user.user_id;

    const recommendations = await Recommendation.findAll({
      where: { patient_id },
      include: [{
        model: User,
        as: 'PsychiatristUser',
        attributes: ['full_name', 'profile_picture'],
        include: [{
          model: Psychiatrist,
          as: 'Psychiatrist',
          attributes: ['specialization']
        }]
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchPsychiatrists,
  bookAppointment,
  cancelAppointment,
  getAppointmentHistory,
  submitAssessment,
  getPrescriptions,
  getRecommendations
};
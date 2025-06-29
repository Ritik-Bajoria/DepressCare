const db = require('../models');
const { User, Psychiatrist, Appointment, DepressionForm, Prescription, Recommendation, FormResponse } = db;
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
const bookAppointment = async (req, res) => {
  try {
    const { psychiatrist_id, scheduled_time, previous_diagnosis, symptoms, short_description } = req.body;
    const patient_id = req.user.user_id;

    // Validate required fields
    if (!psychiatrist_id || !scheduled_time) {
      return res.status(400).json({ error: 'Psychiatrist ID and scheduled time are required' });
    }

    // 1. Get psychiatrist (with role validation) and patient
    const [psychiatrist, patient] = await Promise.all([
      User.findOne({
        where: { 
          user_id: psychiatrist_id,
          role: 'Psychiatrist' // Ensure the user is actually a psychiatrist
        },
        include: [{
          model: Psychiatrist,
          as: 'Psychiatrist',
          required: true // Enforce that the user must have a psychiatrist profile
        }],
        attributes: ['user_id', 'email', 'full_name']
      }),
      User.findByPk(patient_id, {
        attributes: ['user_id', 'email', 'full_name']
      })
    ]);

    if (!psychiatrist) {
      return res.status(404).json({ 
        error: 'Psychiatrist not found',
        details: 'The specified ID does not belong to a valid psychiatrist'
      });
    }
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // 2. Validate scheduled time is in the future
    if (new Date(scheduled_time) <= new Date()) {
      return res.status(400).json({ error: 'Appointment time must be in the future' });
    }

    // 3. Check psychiatrist availability (optional enhancement)
    const existingAppointment = await Appointment.findOne({
      where: {
        psychiatrist_id,
        scheduled_time: {
          [Op.between]: [
            new Date(new Date(scheduled_time).setMinutes(-30)), // 30 mins before
            new Date(new Date(scheduled_time).setHours(1, 30)) // 1.5 hours after
          ]
        },
        status: {
          [Op.notIn]: ['Cancelled', 'Completed']
        }
      }
    });

    if (existingAppointment) {
      return res.status(409).json({
        error: 'Time slot unavailable',
        details: 'Psychiatrist already has an appointment during this time'
      });
    }

    // 4. Generate meeting link
    const meetLink = await generateMeetingLink({
      psychiatristEmail: psychiatrist.email,
      patientEmail: patient.email,
      startTime: new Date(scheduled_time),
      endTime: new Date(new Date(scheduled_time).setHours(new Date(scheduled_time).getHours() + 1)),
      summary: `Therapy Session - ${patient.full_name}`
    });

    // 5. Create appointment with all required fields
    const appointment = await Appointment.create({
      patient_id,
      psychiatrist_id,
      scheduled_time: new Date(scheduled_time),
      status: 'Pending',
      previous_diagnosis: previous_diagnosis || false,
      symptoms: symptoms || null,
      short_description: short_description || null,
      meeting_link: meetLink
    });

    // 6. Return appointment with associations
    const createdAppointment = await Appointment.findByPk(appointment.appointment_id, {
      include: [
        { 
          model: User, 
          as: 'PatientUser',
          attributes: ['user_id', 'full_name', 'email']
        },
        { 
          model: User, 
          as: 'PsychiatristUser',
          attributes: ['user_id', 'full_name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdAppointment
    });

  } catch (error) {
    console.error('Booking error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(err => err.message) 
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        error: 'Conflict error',
        details: 'Appointment slot already booked' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to book appointment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
 * @route POST /patients/submitForm
 * @access Private (Patient)
 */
const submitForm = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { patient_id } = req.user;
    const { responses, notes } = req.body;

    // 1. Validate all question IDs exist
    const questionIds = responses.map(r => r.question_id);
    const existingQuestions = await db.FormQuestion.findAll({
      where: { question_id: questionIds },
      attributes: ['question_id'],
      transaction
    });

    if (existingQuestions.length !== questionIds.length) {
      const missingIds = questionIds.filter(id => 
        !existingQuestions.some(q => q.question_id === id)
      );
      throw new Error(`Invalid question IDs: ${missingIds.join(', ')}`);
    }

    // 2. Calculate total score
    const total_score = responses.reduce((sum, r) => sum + r.response_value, 0);

    // 3. Create form and responses
    const form = await db.DepressionForm.create({
      patient_id,
      total_score,
      notes
    }, { transaction });

    await db.FormResponse.bulkCreate(
      responses.map(r => ({
        form_id: form.form_id,
        question_id: r.question_id,
        response_value: r.response_value
      })),
      { transaction }
    );

    await transaction.commit();
    
    res.status(201).json({
      success: true,
      form_id: form.form_id,
      total_score,
      message: 'Form submitted successfully'
    });

  } catch (error) {
    await transaction.rollback();
    
    if (error.message.includes('Invalid question IDs')) {
      return res.status(400).json({ 
        error: 'Invalid form data',
        details: error.message
      });
    }

    console.error('Form submission error:', error);
    res.status(500).json({ 
      error: 'Form submission failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
        model: db.Appointment,
        as: 'Appointment',
        where: { patient_id },
        attributes: ['scheduled_time', 'status'],
        include: [{
          model: db.User,
          as: 'PsychiatristUser',
          attributes: ['full_name'],
          include: [{
            model: db.Psychiatrist,
            as: 'Psychiatrist',
            attributes: ['specialization']
          }]
        }]
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
      include: [
        {
          model: db.User,
          as: 'PsychiatristUser',
          attributes: ['full_name', 'profile_picture'],
          include: [{
            model: db.Psychiatrist,
            as: 'Psychiatrist',
            attributes: ['specialization']
          }]
        }
      ],
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
  submitForm,
  getPrescriptions,
  getRecommendations
};
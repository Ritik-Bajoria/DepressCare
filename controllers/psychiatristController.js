const db = require('../models');
const { Op } = require('sequelize');
const {Appointment} = db;
const { sendCancellationNotice } = require('../utils/emailService');

/**
 * @desc Get psychiatrist's profile
 * @route GET /psychiatrist/profile
 * @access Private (Psychiatrist)
 */
const getProfile = async (req, res, next) => {
  try {
    const psychiatrist_id = req.user.user_id;

    const profile = await db.Psychiatrist.findOne({
      where: { psychiatrist_id },
      include: [{
        model: db.User,
        as: 'User',
        attributes: ['full_name', 'email', 'phone', 'gender', 'date_of_birth', 'profile_picture']
      }]
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update psychiatrist's profile
 * @route PUT /psychiatrist/profile
 * @access Private (Psychiatrist)
 */
const updateProfile = async (req, res, next) => {
  try {
    const psychiatrist_id = req.user.user_id;
    const { 
      full_name, 
      email, 
      phone, 
      gender, 
      date_of_birth,
      profile_picture,
      // Psychiatrist-specific fields
      license_number,
      qualifications,
      specialization,
      years_of_experience,
      bio,
      availability
    } = req.body;

    // Start transaction for atomic operations
    await db.sequelize.transaction(async (t) => {
      // Find user with psychiatrist data
      const user = await db.User.findByPk(psychiatrist_id, {
        include: [{
          model: db.Psychiatrist,
          as: 'Psychiatrist'
        }],
        transaction: t
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Check for duplicate email if email is being updated
      if (email && email !== user.email) {
        const existingUser = await db.User.findOne({ 
          where: { 
            email,
            user_id: { [Op.ne]: psychiatrist_id }
          },
          transaction: t
        });
        
        if (existingUser) {
          return res.status(400).json({ 
            success: false, 
            message: 'Email already in use by another account' 
          });
        }
      }

      // Check for duplicate license number if updating
      if (license_number && user.Psychiatrist && license_number !== user.Psychiatrist.license_number) {
        const existingPsychiatrist = await db.Psychiatrist.findOne({ 
          where: { 
            license_number,
            psychiatrist_id: { [Op.ne]: psychiatrist_id }
          },
          transaction: t
        });
        
        if (existingPsychiatrist) {
          return res.status(400).json({ 
            success: false, 
            message: 'License number already in use by another psychiatrist' 
          });
        }
      }

      // Handle profile picture update if provided
      let profilePicturePath = user.profile_picture;
      if (profile_picture) {
        // Delete old profile picture if it exists
        if (profilePicturePath) {
          await deleteProfilePicture(profilePicturePath);
        }
        // Save new profile picture
        profilePicturePath = await saveProfilePicture(profile_picture);
      }

      // Update user fields if provided
      if (full_name !== undefined) user.full_name = full_name;
      if (email !== undefined) user.email = email;
      if (phone !== undefined) user.phone = phone;
      if (gender !== undefined) user.gender = gender;
      if (date_of_birth !== undefined) user.date_of_birth = date_of_birth;
      if (profilePicturePath) user.profile_picture = profilePicturePath;

      await user.save({ transaction: t });

      // Update psychiatrist fields
      if (user.Psychiatrist) {
        if (license_number !== undefined) user.Psychiatrist.license_number = license_number;
        if (qualifications !== undefined) user.Psychiatrist.qualifications = qualifications;
        if (specialization !== undefined) user.Psychiatrist.specialization = specialization;
        if (years_of_experience !== undefined) user.Psychiatrist.years_of_experience = years_of_experience;
        if (bio !== undefined) user.Psychiatrist.bio = bio;
        if (availability !== undefined) user.Psychiatrist.availability = availability;
        
        await user.Psychiatrist.save({ transaction: t });
      } else {
        // Create psychiatrist record if it doesn't exist (shouldn't happen for psychiatrists)
        await db.Psychiatrist.create({
          psychiatrist_id: user.user_id,
          license_number: license_number || null,
          qualifications: qualifications || null,
          specialization: specialization || null,
          years_of_experience: years_of_experience || 0,
          bio: bio || null,
          availability: availability !== undefined ? availability : true
        }, { transaction: t });
      }

      // Fetch updated user with psychiatrist data
      const updatedUser = await db.User.findByPk(psychiatrist_id, {
        include: [{
          model: db.Psychiatrist,
          as: 'Psychiatrist'
        }],
        transaction: t
      });

      res.json({ 
        success: true, 
        message: 'Profile updated successfully',
        data: {
          user_id: updatedUser.user_id,
          full_name: updatedUser.full_name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          gender: updatedUser.gender,
          date_of_birth: updatedUser.date_of_birth,
          profile_picture: updatedUser.profile_picture,
          psychiatrist: {
            license_number: updatedUser.Psychiatrist.license_number,
            qualifications: updatedUser.Psychiatrist.qualifications,
            specialization: updatedUser.Psychiatrist.specialization,
            years_of_experience: updatedUser.Psychiatrist.years_of_experience,
            bio: updatedUser.Psychiatrist.bio,
            availability: updatedUser.Psychiatrist.availability
          }
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get psychiatrist's patient list
 * @route GET /psychiatrists/patients
 * @access Private (Psychiatrist)
 */
const getPatients = async (req, res, next) => {
  try {
    const psychiatrist_id = req.user.user_id;

    // First get all unique patient IDs for this psychiatrist
    const appointments = await db.Appointment.findAll({
      where: { psychiatrist_id },
      attributes: ['patient_id'],
      group: ['patient_id'],
      raw: true
    });

    if (!appointments || appointments.length === 0) {
      return res.json({ 
        success: true, 
        count: 0, 
        data: [],
        message: 'No patients found for this psychiatrist'
      });
    }

    const patientIds = appointments.map(a => a.patient_id);

    // Then get full patient details
    const patients = await db.User.findAll({
      where: { 
        user_id: { [Op.in]: patientIds } 
      },
      attributes: ['user_id', 'full_name', 'profile_picture'],
      include: [{
        model: db.Patient,
        as: 'Patient',
        attributes: ['previous_diagnosis']
      }],
      order: [['full_name', 'ASC']]
    });

    res.json({ 
      success: true, 
      count: patients.length,
      data: patients 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get patient's details
 * @route GET /psychiatrist/patients/:id
 * @access Private (Psychiatrist)
 */
const getPatientDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const psychiatrist_id = req.user.user_id;

    // Verify the patient has appointments with this psychiatrist
    const hasAppointments = await db.Appointment.findOne({
      where: { 
        patient_id: id,
        psychiatrist_id 
      }
    });

    if (!hasAppointments) {
      return res.status(403).json({ 
        success: false, 
        message: 'Patient not associated with this psychiatrist' 
      });
    }

    const patient = await db.User.findByPk(id, {
      attributes: ['user_id', 'full_name', 'profile_picture', 'gender', 'date_of_birth'],
      include: [{
        model: db.Patient,
        as: 'Patient',
        attributes: ['previous_diagnosis', 'symptoms', 'short_description']
      }]
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get patient's depression forms
 * @route GET /psychiatrists/patients/:id/assessments
 * @access Private (Psychiatrist)
 */
const getPatientAssessments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const psychiatrist_id = req.user.user_id;

    // Verify the patient has appointments with this psychiatrist
    const hasAppointments = await db.Appointment.findOne({
      where: { 
        patient_id: id,
        psychiatrist_id 
      }
    });

    if (!hasAppointments) {
      return res.status(403).json({ 
        success: false, 
        message: 'Patient not associated with this psychiatrist' 
      });
    }

    const assessments = await db.DepressionForm.findAll({
      where: { patient_id: id },
      include: [{
        model: db.FormResponse,
        as: 'FormResponses', // Must match the alias defined in your association
        include: [{
          model: db.FormQuestion,
          as: 'Question', // Must match the alias defined in your association
          attributes: ['question_text']
        }]
      }],
      order: [['filled_at', 'DESC']]
    });

    res.json({ 
      success: true,
      count: assessments.length,
      data: assessments 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get psychiatrist's appointments
 * @route GET /psychiatrist/appointments
 * @access Private (Psychiatrist)
 */
const getAppointments = async (req, res, next) => {
  try {
    const { user_id, role } = req.user;
    const { status, from, to, patient_id } = req.query;

    // 1. Build the base query conditions
    const where = {};
    const include = [{
      model: db.User,
      as: 'PatientUser',
      attributes: ['user_id', 'full_name', 'email', 'profile_picture', 'phone']
    }, {
      model: db.User,
      as: 'PsychiatristUser',
      attributes: ['user_id', 'full_name', 'email', 'profile_picture']
    }];

    // 2. Role-based filtering
    if (role === 'Psychiatrist') {
      where.psychiatrist_id = user_id;
    } else if (role === 'Patient') {
      where.patient_id = user_id;
    } else if (role === 'Admin' && patient_id) {
      where.patient_id = patient_id;
    }

    // 3. Additional filters
    if (status) {
      where.status = Array.isArray(status) ? { [Op.in]: status } : status;
    }

    if (from && to) {
      where.scheduled_time = {
        [Op.between]: [
          new Date(from),
          new Date(new Date(to).setHours(23, 59, 59, 999))
        ]
      };
    } else if (from) {
      where.scheduled_time = { [Op.gte]: new Date(from) };
    } else if (to) {
      where.scheduled_time = { [Op.lte]: new Date(to) };
    }

    // 4. Execute query with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: appointments } = await db.Appointment.findAndCountAll({
      where,
      include,
      order: [['scheduled_time', 'ASC']],
      limit,
      offset,
      distinct: true // Important for correct counting with includes
    });

    // 5. Format response
    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: appointments.map(appt => ({
        appointment_id: appt.appointment_id,
        scheduled_time: appt.scheduled_time,
        status: appt.status,
        meeting_link: appt.meeting_link,
        symptoms: appt.symptoms,
        short_description: appt.short_description,
        previous_diagnosis: appt.previous_diagnosis,
        patient: appt.PatientUser,
        psychiatrist: appt.PsychiatristUser,
        created_at: appt.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching appointments:', error);
    next(error);
  }
};

/**
 * @desc Update appointment status
 * @route PATCH /psychiatrist/appointments/:id/status
 * @access Private (Psychiatrist)
 */
// controllers/psychiatristController.js
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status value
    const allowedStatuses = ['Scheduled', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    // Find appointment with patient and psychiatrist details
    const appointment = await Appointment.findOne({
      where: {
        appointment_id: id,
        psychiatrist_id: req.user.user_id
      },
      include: [
        {
          model: db.User,
          as: 'PatientUser',
          attributes: ['email', 'full_name']
        },
        {
          model: db.User,
          as: 'PsychiatristUser',
          attributes: ['full_name']
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Save old status for comparison
    const oldStatus = appointment.status;
    await appointment.update({ status });

    // Send cancellation email if status changed to Cancelled
    if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
      try {
        await sendCancellationNotice({
          userEmail: appointment.PatientUser.email,
          userName: appointment.PatientUser.full_name,
          psychiatristName: appointment.PsychiatristUser.full_name,
          appointmentTime: appointment.scheduled_time.toLocaleString()
        });
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Appointment status updated successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
};

/**
 * @desc Create recommendation for patient
 * @route POST /psychiatrist/recommendations
 * @access Private (Psychiatrist)
 */
const createRecommendation = async (req, res, next) => {
  try {
    const psychiatrist_id = req.user.user_id;
    const { patient_id, content } = req.body;

    // Verify the patient has appointments with this psychiatrist
    const hasAppointments = await db.Appointment.findOne({
      where: { 
        patient_id,
        psychiatrist_id 
      }
    });

    if (!hasAppointments) {
      return res.status(403).json({ 
        success: false, 
        message: 'Patient not associated with this psychiatrist' 
      });
    }

    const recommendation = await db.Recommendation.create({
      psychiatrist_id,
      patient_id,
      content
    });

    res.status(201).json({ 
      success: true,
      message: 'Recommendation created successfully',
      data: recommendation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Upload prescription for appointment
 * @route POST /psychiatrist/prescriptions
 * @access Private (Psychiatrist)
 */
const uploadPrescription = async (req, res, next) => {
  try {
    const uploaded_by = req.user.user_id;
    const { appointment_id, notes } = req.body;
    const document_url = req.file ? `/uploads/prescriptions/${req.file.filename}` : null;
    // Verify the appointment belongs to this psychiatrist
    const appointment = await db.Appointment.findOne({
      where: { 
        appointment_id,
        psychiatrist_id: uploaded_by 
      }
    });

    if (!appointment) {
      return res.status(403).json({ 
        success: false, 
        message: 'Appointment not found or not authorized' 
      });
    }

    const prescription = await db.Prescription.create({
      appointment_id,
      uploaded_by,
      document_url,
      notes
    });

    res.status(201).json({ 
      success: true,
      message: 'Prescription uploaded successfully',
      data: prescription
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getPatients,
  getPatientDetails,
  getPatientAssessments,
  getAppointments,
  updateAppointmentStatus,
  createRecommendation,
  uploadPrescription
};
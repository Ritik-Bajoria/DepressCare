const db = require('../models');
const { JobPosting, PsychiatristSalary, PatientPayment, CommunityPost,User, Appointment, Prescription, Psychiatrist } = db;
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const emailService = require('../utils/emailService');

// Convert callback functions to promise-based
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
/**
 * @desc Create job posting
 * @route POST /internal/jobs
 * @access Private (InternalManagement)
 */
const createJobPosting = async (req, res, next) => {
  try {
    const { title, description, requirements, picture } = req.body;
    const posted_by = req.user.user_id;

    // Validate required fields
    if (!title || !description || !requirements) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and requirements are required fields'
      });
    }

    // Verify the user exists
    const user = await User.findByPk(posted_by);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Handle picture upload if provided
    let picture_url = null;
    if (picture) {
      try {
        picture_url = await savePicture(picture, 'jobs'); // Added 'jobs' as folder
      } catch (error) {
        console.error('Error saving job picture:', error);
        return res.status(400).json({
          success: false,
          message: 'Failed to process image upload'
        });
      }
    }

    // Create job posting in database
    const job = await JobPosting.create({
      posted_by,
      title,
      description,
      requirements,
      picture_url
    });

    // Include poster information in response
    const responseData = {
      job_id: job.job_id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      picture_url: job.picture_url,
      posted_at: job.posted_at,
      poster: {
        user_id: user.user_id,
        full_name: user.full_name,
        profile_picture: user.profile_picture
      }
    };

    res.status(201).json({
      success: true,
      message: 'Job posting created successfully',
      data: responseData
    });

  } catch (error) {
    // Handle specific error cases
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user reference'
      });
    }

    if (error.message.includes('Invalid base64 image data')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Please provide a valid base64 encoded image.'
      });
    }

    console.error('Error creating job posting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job posting',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to save base64 profile picture to server
 * @param {string} base64Data - Base64 encoded image data
 * @returns {string} - Path to saved image
 */
async function savePicture(base64Data,type) {
  try {
    // Extract the image type and data from base64 string
    const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image data');
    }

    const imageType = matches[1];
    const imageData = matches[2];
    const buffer = Buffer.from(imageData, 'base64');
    
    // Create unique filename (using timestamp)
    const timestamp = Date.now();
    const filename = `job_${timestamp}.${imageType}`;
    const uploadDir = path.join(__dirname, '../uploads',type);
    const filePath = path.join(uploadDir, filename);

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    fs.writeFileSync(filePath, buffer);
    
    // Return relative path to be stored in database
    return `/uploads/${type}/${filename}`;
  } catch (error) {
    console.error('Error saving job picture:', error);
    throw error;
  }
}


/**
 * @desc    Create community posts
 * @route   POST /internal/community-posts
 * @access  Private (internalManagement)
 */
const createCommunityPost = async (req, res, next) => {
  try {
    const { title, content, category, picture } = req.body;
    const posted_by = req.user.user_id;

    // Validate required fields
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and category are required fields'
      });
    }

    // Handle picture upload if provided
    let picture_url = null;
    if (picture) {
      try {
        picture_url = await savePicture(picture, 'community');
      } catch (error) {
        console.error('Error saving community post picture:', error);
        return res.status(400).json({
          success: false,
          message: 'Failed to process image upload'
        });
      }
    }

    const post = await CommunityPost.create({
      posted_by,
      title,
      category,
      content,
      picture_url
      // posted_at will be automatically set by the model's defaultValue
    });

    res.status(201).json({
      success: true,
      message: 'Community post created successfully',
      data: {
        post_id: post.post_id,
        posted_by: post.posted_by,
        title: post.title,
        category: post.category,
        content: post.content,
        picture_url: post.picture_url,
        posted_at: post.posted_at
      }
    });

  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    next(error);
  }
};

const getAllAppointmentsWithPayments = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      from_date, 
      to_date 
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (from_date || to_date) {
      where.scheduled_time = {};
      if (from_date) where.scheduled_time[Op.gte] = new Date(from_date);
      if (to_date) where.scheduled_time[Op.lte] = new Date(to_date);
    }

    const { count, rows: appointments } = await Appointment.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['scheduled_time', 'DESC']],
      include: [
        {
          model: User,
          as: 'PatientUser',
          attributes: ['user_id', 'full_name', 'email', 'phone']
        },
        {
          model: User,
          as: 'PsychiatristUser',
          attributes: ['user_id', 'full_name', 'email', 'phone']
        },
        {
          model: PatientPayment,
          as: 'Payment',
          required: false // Left join to include appointments without payments
        },
        {
          model: Prescription,
          as: 'Prescriptions',
          required: false
        }
      ]
    });

    // Format response
    const formattedAppointments = appointments.map(appointment => ({
      appointment_id: appointment.appointment_id,
      scheduled_time: appointment.scheduled_time,
      status: appointment.status,
      meeting_link: appointment.meeting_link,
      symptoms: appointment.symptoms,
      short_description: appointment.short_description,
      patient: appointment.PatientUser,
      psychiatrist: appointment.PsychiatristUser,
      payment: appointment.Payment || { status: 'unpaid' },
      prescriptions: appointment.Prescriptions
    }));

    res.json({
      success: true,
      data: formattedAppointments,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        perPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching appointments:', error);
    next(error);
  }
};

/**
 * @desc Get all job postings
 * @route GET /internal/jobs
 * @access Private (InternalManagement)
 */
const getJobPostings = async (req, res, next) => {
  try {
    const jobs = await JobPosting.findAll({
      order: [['posted_at', 'DESC']]
    });

    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Record patient payment
 * @route POST /internal/payments
 * @access Private (InternalManagement)
 */
const recordPatientPayment = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { patient_id, appointment_id, amount } = req.body;

    // Validate input
    if (!patient_id || !appointment_id || !amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid input data'
      });
    }

    // Check if patient and appointment exist
    const [patient, appointment, psychiatrist] = await Promise.all([
      db.Patient.findByPk(patient_id, { 
        include: [{
          model: User,
          as: 'User',
          attributes: ['user_id', 'full_name', 'email']
        }],
        transaction 
      }),
      db.Appointment.findByPk(appointment_id, { transaction }),
      db.Appointment.findByPk(appointment_id, {
        include: [{
          model: User,
          as: 'PsychiatristUser',
          attributes: ['user_id', 'full_name', 'email']
        }],
        transaction
      })
    ]);

    if (!patient) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (!appointment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Create payment
    const payment = await PatientPayment.create({
      patient_id,
      appointment_id,
      amount,
      payment_status: 'Paid'
    }, { transaction });

    // Send email notifications
    try {
      // Email to patient
      if (patient.User && patient.User.email) {
        const patientEmailContent = {
          userEmail: patient.User.email,
          userName: patient.User.full_name,
          amount: amount,
          appointmentTime: appointment.scheduled_time,
          paymentDate: new Date()
        };

        await emailService.sendPaymentConfirmation(patientEmailContent);
      }

      // Email to psychiatrist
      if (psychiatrist.PsychiatristUser && psychiatrist.PsychiatristUser.email) {
        const psychiatristEmailContent = {
          userEmail: psychiatrist.PsychiatristUser.email,
          userName: psychiatrist.PsychiatristUser.full_name,
          patientName: patient.User ? patient.User.full_name : 'Patient',
          amount: amount,
          appointmentTime: appointment.scheduled_time
        };

        await emailService.sendPaymentNotification(psychiatristEmailContent);
      }
    } catch (emailError) {
      console.error('Error sending payment emails:', emailError);
      // Don't fail the whole operation if email fails
    }

    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment
    });
  } catch (error) {
    await transaction.rollback();
    
    // Handle specific Sequelize errors
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient or appointment reference'
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    next(error);
  }
};

/**
 * @desc Process psychiatrist salary
 * @route POST /internal/salaries
 * @access Private (InternalManagement)
 */
const processSalary = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { psychiatrist_id, month, year, amount } = req.body;

    // 1. Validate input
    if (!psychiatrist_id || !month || !year || !amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid fields'
      });
    }

    // 2. Check if psychiatrist exists
    const psychiatrist = await db.Psychiatrist.findByPk(psychiatrist_id, {
      include: [{
        model: User,
        as: 'User',
        attributes: ['user_id', 'full_name', 'email']
      }],
      transaction
    });
    
    if (!psychiatrist) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Psychiatrist not found'
      });
    }

    // 3. Create salary record with status 'Paid'
    const salary = await db.PsychiatristSalary.create({
      psychiatrist_id,
      month,
      year,
      amount,
      payment_status: 'Paid', // Set to Paid immediately
      processed_at: new Date() // Add processing timestamp
    }, { transaction });

    // 4. Send email notification
    try {
      if (psychiatrist.User && psychiatrist.User.email) {
        const salaryEmailContent = {
          userEmail: psychiatrist.User.email,
          userName: psychiatrist.User.full_name,
          amount: amount,
          month: month,
          year: year,
          paymentDate: new Date()
        };

        await emailService.sendSalaryPaidNotification(salaryEmailContent);
      }
    } catch (emailError) {
      console.error('Error sending salary email:', emailError);
      // Don't fail the whole operation if email fails
    }

    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Salary processed and paid successfully',
      data: salary
    });
  } catch (error) {
    await transaction.rollback();
    
    console.error('Salary processing error:', error);
    
    // Handle specific error types
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid psychiatrist reference'
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process salary'
    });
  }
};

/**
 * @desc Update salary payment status
 * @route PATCH /internal/salaries/:id/status
 * @access Private (InternalManagement)
 */
const updateSalaryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    // Validate input
    if (!payment_status || !['Paid', 'Pending'].includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const salary = await PsychiatristSalary.findByPk(id, {
      include: [{
        model: Psychiatrist,
        as: 'Psychiatrist',
        include: [{
          model: User,
          as: 'User',
          attributes: ['user_id', 'full_name', 'email']
        }]
      }]
    });
    
    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    const oldStatus = salary.payment_status;
    await salary.update({ 
      payment_status,
      // Update processed_at if changing to Paid
      processed_at: payment_status === 'Paid' ? new Date() : salary.processed_at
    });

    // Send email notification if status changed to Paid
    if (payment_status === 'Paid' && oldStatus !== 'Paid' && salary.Psychiatrist.User) {
      try {
        const salaryPaidContent = {
          userEmail: salary.Psychiatrist.User.email,
          userName: salary.Psychiatrist.User.full_name,
          amount: salary.amount,
          month: salary.month,
          year: salary.year,
          paymentDate: new Date()
        };

        await emailService.sendSalaryPaidNotification(salaryPaidContent);
      } catch (emailError) {
        console.error('Error sending salary paid email:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Salary status updated successfully',
      data: salary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get financial reports
 * @route GET /internal/reports/financial
 * @access Private (InternalManagement)
 */
const getFinancialReports = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const where = {};
    if (month) where.month = month;
    if (year) where.year = year;

    const [payments, salaries] = await Promise.all([
      PatientPayment.findAll({
        where,
        order: [['payment_date', 'DESC']]
      }),
      PsychiatristSalary.findAll({
        where,
        order: [['processed_at', 'DESC']]
      })
    ]);

    res.json({
      success: true,
      data: {
        payments,
        salaries
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAllPsychiatrists = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      available,
      specialization
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (available !== undefined) where.availability = available;
    if (specialization) where.specialization = specialization;

    const { count, rows: psychiatrists } = await Psychiatrist.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['years_of_experience', 'DESC']],
      include: [{
        model: User,
        as: 'User',
        attributes: ['user_id', 'full_name', 'email', 'phone', 'profile_picture', 'gender', 'date_of_birth']
      }]
    });

    // Format response
    const formattedPsychiatrists = psychiatrists.map(psychiatrist => {
      const userData = psychiatrist.User ? psychiatrist.User.get({ plain: true }) : null;
      
      return {
        psychiatrist_id: psychiatrist.psychiatrist_id,
        license_number: psychiatrist.license_number,
        qualifications: psychiatrist.qualifications,
        specialization: psychiatrist.specialization,
        years_of_experience: psychiatrist.years_of_experience,
        bio: psychiatrist.bio,
        availability: psychiatrist.availability,
        user: userData
      };
    });

    res.json({
      success: true,
      data: formattedPsychiatrists,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        perPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching psychiatrists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch psychiatrists',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createJobPosting,
  getJobPostings,
  recordPatientPayment,
  processSalary,
  updateSalaryStatus,
  getFinancialReports,
  createCommunityPost,
  getAllAppointmentsWithPayments,
  getAllPsychiatrists
};
const db = require('../models');
const { JobPosting, PsychiatristSalary, PatientPayment } = db;
const { Op } = require('sequelize');

/**
 * @desc Create job posting
 * @route POST /internal/jobs
 * @access Private (InternalManagement)
 */
const createJobPosting = async (req, res, next) => {
  try {
    const { title, description, requirements } = req.body;
    const posted_by = req.user.user_id;

    const job = await JobPosting.create({
      posted_by,
      title,
      description,
      requirements
    });

    res.status(201).json({
      success: true,
      message: 'Job posting created successfully',
      data: job
    });
  } catch (error) {
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
    const [patient, appointment] = await Promise.all([
      db.Patient.findByPk(patient_id, { transaction }),
      db.Appointment.findByPk(appointment_id, { transaction })
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
    const psychiatrist = await db.Psychiatrist.findByPk(psychiatrist_id, { transaction });
    if (!psychiatrist) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Psychiatrist not found'
      });
    }

    // 3. Create salary record
    const salary = await db.PsychiatristSalary.create({
      psychiatrist_id,
      month,
      year,
      amount,
      payment_status: 'Pending'
    }, { transaction });

    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Salary processed successfully',
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

    const salary = await PsychiatristSalary.findByPk(id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    await salary.update({ payment_status });

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

module.exports = {
  createJobPosting,
  getJobPostings,
  recordPatientPayment,
  processSalary,
  updateSalaryStatus,
  getFinancialReports
};
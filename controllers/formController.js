const db = require('../models');
const { DepressionForm, FormQuestion, FormResponse, User } = db;
const { Op } = require('sequelize');

/**
 * @desc Get all form questions
 * @route GET /api/forms/questions
 * @access Public
 */
const getFormQuestions = async (req, res) => {
  try {
    const questions = await FormQuestion.findAll();
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
};

const addQuestion = async (req, res, next) => {
  try {
    const { question_text, score_type } = req.body;

    if (!question_text || !score_type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const validTypes = ['Likert', 'Binary', 'Scale'];
    if (!validTypes.includes(score_type)) {
      return res.status(400).json({ message: 'Invalid score type' });
    }

    const newQuestion = await FormQuestion.create({ question_text, score_type });

    res.status(201).json({ success: true, data: newQuestion });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get form history for a patient
 * @route GET /api/forms/history
 * @access Private (Patient)
 */
const getFormHistory = async (req, res) => {
  try {
    // Debug: Check what's actually in req.user
    console.log('User object:', req.user);
    
    // Use user_id if patient_id doesn't exist
    const patientId = req.user.patient_id || req.user.user_id;
    
    if (!patientId) {
      return res.status(400).json({ 
        error: 'Patient ID not available',
        details: 'The authenticated user does not have a patient ID'
      });
    }

    const forms = await DepressionForm.findAll({
      where: { patient_id: patientId },
      order: [['filled_at', 'DESC']],
      include: [
        {
          model: FormResponse,
          as: 'Responses',
          include: [{
            model: FormQuestion,
            as: 'Question'
          }]
        },
        {
          model: User,
          as: 'Patient',
          attributes: ['user_id', 'full_name']
        }
      ]
    });

    res.json(forms);
  } catch (error) {
    console.error('Error fetching form history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch form history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc Get form details by ID
 * @route GET /api/forms/:id
 * @access Private (Patient/Psychiatrist)
 */
const getFormDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await DepressionForm.findByPk(id, {
      include: [
        {
          model: FormResponse,
          as: 'Responses', // Matches model association
          include: [{
            model: FormQuestion,
            as: 'Question' // Need to verify this matches FormResponse association
          }]
        },
        {
          model: User,
          as: 'Patient', // Matches model association
          attributes: ['user_id', 'full_name']
        }
      ]
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Authorization check
    if (req.user.role === 'Patient' && form.patient_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching form details:', error);
    res.status(500).json({ error: 'Failed to fetch form details' });
  }
};

module.exports = {
  getFormQuestions,
  getFormHistory,
  addQuestion,
  getFormDetails
};
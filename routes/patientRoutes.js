const express = require('express');
const router = express.Router();
const roleMiddleware = require('../middlewares/roleMiddleware');
const patientController = require('../controllers/patientController');
const { check,validationResult} = require('express-validator');
const { asyncHandler } = require('../middlewares/errorHandler');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication and patient role middleware to all routes
router.use(authMiddleware, roleMiddleware(['Patient']));

/**
 * @route GET /patient/psychiatrists
 * @desc Search psychiatrists
 * @access Private (Patient)
 */
router.get('/psychiatrists', asyncHandler(patientController.searchPsychiatrists));

/**
 * @route POST /patient/appointments
 * @desc Book new appointment
 * @access Private (Patient)
 */
router.post(
  '/appointments',
  [
    check('psychiatrist_id')
      .isInt({ min: 1 })
      .withMessage('Psychiatrist ID must be a positive integer'),
      
    check('scheduled_time')
      .isISO8601()
      .withMessage('Invalid ISO 8601 date format')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Appointment time must be in the future');
        }
        return true;
      }),
      
    check('previous_diagnosis')
      .optional()
      .isBoolean()
      .withMessage('Previous diagnosis must be a boolean value'),
      
    check('symptoms')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Symptoms must be a string (max 500 characters)'),
      
    check('short_description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Short description must be a string (max 255 characters)')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    await patientController.bookAppointment(req, res);
  })
);
/**
 * @route PATCH /patient/appointments/:id/cancel
 * @desc Cancel appointment
 * @access Private (Patient)
 */
router.patch(
  '/appointments/:id/cancel',
  [
    check('id').isInt().withMessage('Invalid appointment ID')
  ],
  asyncHandler(patientController.cancelAppointment)
);

/**
 * @route GET /patient/appointments
 * @desc Get appointment history
 * @access Private (Patient)
 */
router.get('/appointments', asyncHandler(patientController.getAppointmentHistory));

/**
 * @route POST /patient/assessments
 * @desc Submit depression self-assessment
 * @access Private (Patient)
 */
router.post(
  '/submitForm',
  [
    check('responses').isArray().withMessage('Responses must be an array'),
    check('responses.*.question_id').isInt().withMessage('Invalid question ID'),
    check('responses.*.score').isInt({ min: 0 }).withMessage('Invalid score value'),
    check('notes').optional().isString().withMessage('Notes must be a string')
  ],
  asyncHandler(patientController.submitForm)
);

/**
 * @route GET /patient/prescriptions
 * @desc Get prescriptions
 * @access Private (Patient)
 */
router.get('/prescriptions', asyncHandler(patientController.getPrescriptions));

/**
 * @route GET /patient/recommendations
 * @desc Get recommendations
 * @access Private (Patient)
 */
router.get('/recommendations', asyncHandler(patientController.getRecommendations));

module.exports = router;
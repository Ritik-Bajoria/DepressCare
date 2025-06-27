const express = require('express');
const router = express.Router();
const roleMiddleware = require('../middlewares/roleMiddleware');
const patientController = require('../controllers/patientController');
const { check } = require('express-validator');
const { asyncHandler } = require('../middlewares/errorHandler');

// Apply authentication and patient role middleware to all routes
router.use(roleMiddleware(['Patient']));

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
    check('psychiatrist_id').isInt().withMessage('Invalid psychiatrist ID'),
    check('scheduled_time').isISO8601().withMessage('Invalid date format')
  ],
  asyncHandler(patientController.bookAppointment)
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
  '/assessments',
  [
    check('responses').isArray().withMessage('Responses must be an array'),
    check('responses.*.question_id').isInt().withMessage('Invalid question ID'),
    check('responses.*.score').isInt({ min: 0 }).withMessage('Invalid score value'),
    check('notes').optional().isString().withMessage('Notes must be a string')
  ],
  asyncHandler(patientController.submitAssessment)
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
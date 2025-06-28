const express = require('express');
const router = express.Router();
const psychiatristController = require('../controllers/psychiatristController');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { check, validationResult } = require('express-validator');
const { asyncHandler } = require('../middlewares/errorHandler');
const { upload, handleUploadErrors } = require('../utils/fileUpload');
const validate = require('../middlewares/validate');
const authMiddleware = require('./middlewares/authMiddleware');
// Make sure to use express.json() middleware
router.use(express.json());
// Apply authentication and psychiatrist role middleware to all routes
router.use(authMiddleware,roleMiddleware(['Psychiatrist']));

// Profile routes
router.get('/profile', asyncHandler(psychiatristController.getProfile));
router.put(
  '/profile',
  [
    check('qualifications').optional().isString(),
    check('specialization').optional().isString(),
    check('years_of_experience').optional().isInt({ min: 0 }),
    check('bio').optional().isString(),
    check('availability').optional().isBoolean()
  ],
  validate,
  asyncHandler(psychiatristController.updateProfile)
);

// Patient routes
router.get('/patients',validate, asyncHandler(psychiatristController.getPatients));
router.get('/patients/:id',validate, asyncHandler(psychiatristController.getPatientDetails));
router.get('/patients/:id/assessments',validate, asyncHandler(psychiatristController.getPatientAssessments));

// Appointment routes
router.get(
  '/appointments',
  [
    check('status').optional().isIn(['Scheduled', 'Completed', 'Cancelled']),
    check('from').optional().isISO8601(),
    check('to').optional().isISO8601()
  ],
  validate,
  asyncHandler(psychiatristController.getAppointments)
);
router.patch(
  '/appointments/:id/status',
  [
    check('id').isInt().withMessage('Invalid appointment ID'),
    check('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['Scheduled', 'Completed', 'Cancelled'])
      .withMessage('Invalid status value')
  ],
  validate,
  asyncHandler(psychiatristController.updateAppointmentStatus)
);


// Recommendation routes
router.post(
  '/recommendations',
  [
    check('patient_id').isInt().withMessage('Patient ID must be an integer'),
    check('content').isString().notEmpty().withMessage('Content is required')
  ],
  validate,
  asyncHandler(psychiatristController.createRecommendation)
);

// Prescription routes
router.post(
  '/prescriptions',
  upload.single('document'),
  (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'A PDF document is required'
      });
    }
    next();
  },
  handleUploadErrors,
  [
    check('appointment_id')
      .notEmpty()
      .withMessage('Appointment ID is required')
      .isInt()
      .withMessage('Invalid Appointment ID'),
    check('notes').optional().isString()
  ],
  validate,
  asyncHandler(psychiatristController.uploadPrescription)
);

module.exports = router;
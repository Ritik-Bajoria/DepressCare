const express = require('express');
const router = express.Router();
const psychiatristController = require('../controllers/psychiatristController');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { check } = require('express-validator');
const { asyncHandler } = require('../middlewares/errorHandler');
const upload = require('../utils/fileUpload');

// Apply authentication and psychiatrist role middleware to all routes
router.use(roleMiddleware(['Psychiatrist']));

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
  asyncHandler(psychiatristController.updateProfile)
);

// Patient routes
router.get('/patients', asyncHandler(psychiatristController.getPatients));
router.get('/patients/:id', asyncHandler(psychiatristController.getPatientDetails));
router.get('/patients/:id/assessments', asyncHandler(psychiatristController.getPatientAssessments));

// Appointment routes
router.get(
  '/appointments',
  [
    check('status').optional().isIn(['Scheduled', 'Completed', 'Cancelled']),
    check('from').optional().isISO8601(),
    check('to').optional().isISO8601()
  ],
  asyncHandler(psychiatristController.getAppointments)
);
router.patch(
  '/appointments/:id/status',
  [
    check('id').isInt(),
    check('status').isIn(['Scheduled', 'Completed', 'Cancelled'])
  ],
  asyncHandler(psychiatristController.updateAppointmentStatus)
);

// Recommendation routes
router.post(
  '/recommendations',
  [
    check('patient_id').isInt(),
    check('content').isString().notEmpty()
  ],
  asyncHandler(psychiatristController.createRecommendation)
);

// Prescription routes
router.post(
  '/prescriptions',
  upload.single('document'),
  [
    check('appointment_id').isInt(),
    check('notes').optional().isString()
  ],
  asyncHandler(psychiatristController.uploadPrescription)
);

module.exports = router;
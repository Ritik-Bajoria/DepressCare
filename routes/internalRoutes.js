const express = require('express');
const router = express.Router();
const roleMiddleware = require('../middlewares/roleMiddleware');
const internalController = require('../controllers/internalController');
const { check } = require('express-validator');
const { asyncHandler } = require('../middlewares/errorHandler');
const validate = require('../middlewares/validate');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply to all routes
router.use(authMiddleware,roleMiddleware(['InternalManagement']));

/**
 * Job Postings Routes
 */
router.post(
  '/jobs',
  [
    check('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    check('description').notEmpty().withMessage('Description is required'),
    check('requirements').notEmpty().withMessage('Requirements are required'),
    check('picture')
      .optional()
      .isString()
      .withMessage('Picture must be a base64 string if provided')
  ],
  validate,
  asyncHandler(internalController.createJobPosting)
);

router.get(
  '/jobs',
  asyncHandler(internalController.getJobPostings)
);

/**
 * Payment Routes
 */
router.post(
  '/payments',
  [
    check('patient_id').isInt().withMessage('Invalid patient ID'),
    check('appointment_id').isInt().withMessage('Invalid appointment ID'),
    check('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number')
  ],
  validate,
  asyncHandler(internalController.recordPatientPayment)
);

/**
 * @route GET /internal/appointments
 * @desc Get all appointments with associated data
 * @access Private (InternalManagement)
 */
router.get(
  '/appointments',
  [
    check('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    check('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    check('status').optional().isIn(['Scheduled', 'Completed', 'Cancelled', 'Pending']).withMessage('Invalid status'),
    check('from_date').optional().isISO8601().withMessage('Invalid from date format'),
    check('to_date').optional().isISO8601().withMessage('Invalid to date format')
  ],
  validate,
  asyncHandler(internalController.getAllAppointmentsWithPayments)
);

/**
 * Salary Routes
 */
router.post(
  '/salaries',
  [
    check('psychiatrist_id')
        .notEmpty().withMessage('psychiatrist_id is required')
        .isInt().withMessage('Invalid psychiatrist ID'),
    check('month')
        .isString()
        .notEmpty().withMessage('Month is required'),
    check('year')
        .notEmpty().withMessage('year is required')
        .isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
    check('amount')
        .notEmpty().withMessage('amount is required')
        .isFloat({ min: 0 }).withMessage('Amount must be a positive number')
  ],
  validate,
  asyncHandler(internalController.processSalary)
);

router.patch(
  '/salaries/:id/status',
  [
    check('id')
        .notEmpty().withMessage('Salary ID is required')
        .isInt().withMessage('Invalid salary ID'),
    check('payment_status')
        .notEmpty().withMessage('Payment Status is required')
        .isIn(['Paid', 'Pending']).withMessage('Invalid status should be (Paid or Pending)')
  ],
  validate,
  asyncHandler(internalController.updateSalaryStatus)
);

/**
 * Report Routes
 */
router.get(
  '/reports/financial',
  [
    check('month').optional().isString(),
    check('year').optional().isInt()
  ],
  validate,
  asyncHandler(internalController.getFinancialReports)
);

/**
 * @route POST /internal/community-posts
 * @desc Create community posts
 * @access Private (Internal)
 */
router.post(
  '/community-posts',
  [
    check('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    check('content').notEmpty().withMessage('Content is required'),
    check('category').notEmpty().withMessage('Category is required'),
    check('picture')
      .optional()
      .isString()
      .withMessage('Picture must be a base64 string if provided')
  ],
  validate,
  asyncHandler(internalController.createCommunityPost)
);

/**
 * @route GET /internal/psychiatrists
 * @desc Get all psychiatrists with their details
 * @access Private (InternalManagement)
 */
router.get(
  '/psychiatrists',
  [
    check('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    check('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    check('available').optional().isBoolean().withMessage('Available must be true or false'),
    check('specialization').optional().isString().withMessage('Specialization must be a string')
  ],
  validate,
  asyncHandler(internalController.getAllPsychiatrists)
);
module.exports = router;
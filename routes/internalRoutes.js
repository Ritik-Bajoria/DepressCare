const express = require('express');
const router = express.Router();
const roleMiddleware = require('../middlewares/roleMiddleware');
const internalController = require('../controllers/internalController');
const { check } = require('express-validator');
const { asyncHandler } = require('../middlewares/errorHandler');
const validate = require('../middlewares/validate');

// Apply to all routes
router.use(roleMiddleware(['InternalManagement']));

/**
 * Job Postings Routes
 */
router.post(
  '/jobs',
  [
    check('title').notEmpty().withMessage('Title is required'),
    check('description').notEmpty().withMessage('Description is required'),
    check('requirements').notEmpty().withMessage('Requirements are required')
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

module.exports = router;
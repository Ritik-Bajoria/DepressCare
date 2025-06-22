const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { asyncHandler } = require('../middlewares/errorHandler');
const { check } = require('express-validator');

// Apply admin role middleware to all routes
router.use(roleMiddleware(['admin']));

/**
 * @route GET /admin/users
 * @desc Get all users
 * @access Private (Admin)
 */
router.get('/users', asyncHandler(adminController.getAllUsers));

/**
 * @route PUT /admin/users/:id/role
 * @desc Update user role
 * @access Private (Admin)
 */
router.put(
  '/users/:id/role',
  [
    check('role')
      .isIn(['Patient', 'Psychiatrist', 'Admin', 'InternalManagement'])
      .withMessage('Invalid role specified')
  ],
  asyncHandler(adminController.updateUserRole)
);

/**
 * @route POST /admin/enroll-psychiatrist
 * @desc Enroll a new psychiatrist
 * @access Private (Admin)
 */
router.post(
  '/enroll-psychiatrist',
  [
    check('user_id').isInt().withMessage('User ID must be an integer'),
    check('license_number').notEmpty().withMessage('License number is required'),
    check('qualifications').notEmpty().withMessage('Qualifications are required'),
    check('specialization').notEmpty().withMessage('Specialization is required'),
    check('years_of_experience')
      .isInt({ min: 0 })
      .withMessage('Years of experience must be a positive number'),
    check('bio').notEmpty().withMessage('Bio is required')
  ],
  asyncHandler(adminController.enrollPsychiatrist)
);

/**
 * @route GET /admin/reports/:type
 * @desc Generate reports (UserStats, AppointmentStats, AssessmentSummary)
 * @access Private (Admin)
 */
router.get(
  '/reports/:type',
  [
    check('type')
      .isIn(['UserStats', 'AppointmentStats', 'AssessmentSummary'])
      .withMessage('Invalid report type'),
    check('format')
      .optional()
      .isIn(['pdf', 'excel', 'json'])
      .withMessage('Invalid format specified'),
    check('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO format (YYYY-MM-DD)'),
    check('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO format (YYYY-MM-DD)')
  ],
  asyncHandler(adminController.generateReports)
);

/**
 * @route POST /admin/community-posts
 * @desc Create community posts
 * @access Private (Admin)
 */
router.post(
  '/community-posts',
  [
    check('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    check('content').notEmpty().withMessage('Content is required')
  ],
  asyncHandler(adminController.createCommunityPost)
);

module.exports = router;
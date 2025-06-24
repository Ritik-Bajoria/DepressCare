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
 * @route POST /admin/enroll-psychiatrist
 * @desc Create new user and enroll as psychiatrist
 * @access Private (Admin)
 */
router.post(
  '/enroll-psychiatrist',
  [
    check('full_name').notEmpty().withMessage('Full name is required'),
    check('email').isEmail().withMessage('Invalid email format'),
    check('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Password must contain at least one uppercase, one lowercase, one number and one special character'),
    check('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    check('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    check('date_of_birth').optional().isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
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
 * @route POST /admin/enroll-internal
 * @desc Create new user and enroll as internal management
 * @access Private (Admin)
 */
router.post(
  '/enroll-internal',
  [
    check('full_name').notEmpty().withMessage('Full name is required'),
    check('email').isEmail().withMessage('Invalid email format'),
    check('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Password must contain at least one uppercase, one lowercase, one number and one special character'),
    check('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    check('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    check('date_of_birth').optional().isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
  ],
  asyncHandler(adminController.enrollInternalManagement)
);


/**
 * @route DELETE /admin/users/:id
 * @desc Delete a user and all associated data
 * @access Private (Admin)
 */
router.delete(
  '/users/:id',
  asyncHandler(adminController.deleteUser)
);

/**
 * @route PATCH /admin/users/:id
 * @desc Update user information
 * @access Private (Admin)
 */
router.patch(
  '/users/:id',
  [
    check('email').optional().isEmail().withMessage('Invalid email format'),
    check('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    check('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    check('date_of_birth').optional().isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
    check('role').optional()
  ],
  asyncHandler(adminController.updateUser)
);

/**
 * @route GET /admin/users
 * @desc Get all users with filtering
 * @access Private (Admin)
 */
router.get(
  '/users',
  [
    check('role').optional().isIn(['Patient', 'Psychiatrist', 'Admin', 'InternalManagement']),
    check('search').optional().trim(),
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  asyncHandler(adminController.getAllUsers)
);

/**
 * @route GET /admin/reports/:type
 * @examples http://localhost:3000/api/admin/reports/UserStats?format=json,
 *           http://localhost:3000/api/admin/reports/AppointmentStats?format=excel&startDate=2023-11-01&endDate=2023-11-30         
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
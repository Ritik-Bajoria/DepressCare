const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const roleMiddleware = require('../middlewares/roleMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/errorHandler');
const { check, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const db = require('../models');
const { User, Psychiatrist } = db;

// Apply admin role middleware to all routes
router.use(authMiddleware, roleMiddleware(['admin']));

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
  validate,
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
      .withMessage('Password must be at least 8 characters'),
    check('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    check('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    check('date_of_birth').optional().isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
  ],
  validate,
  asyncHandler(adminController.enrollInternalManagement)
);


/**
 * @route DELETE /admin/users/:id
 * @desc Delete a user and all associated data
 * @access Private (Admin)
 */
router.delete(
  '/users/:id',
  validate,
  asyncHandler(adminController.deleteUser)
);

/**
 * @route PATCH /admin/users/:id
 * @desc Update user information with role-specific fields
 * @access Private (Admin)
 */
router.patch(
  '/users/:id',
    (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body is required'
      });
    }
    next();
  },
  [
    // Basic user validation
    check('email').optional().isEmail().withMessage('Invalid email format'),
    check('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    check('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    check('date_of_birth').optional().isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
    check('role').optional().isIn(['Patient', 'Psychiatrist', 'Admin', 'InternalManagement']).withMessage('Invalid role'),
    
    // Patient-specific validation
    check('previous_diagnosis').optional().isBoolean().withMessage('Previous diagnosis must be boolean'),
    check('symptoms').optional().isString().withMessage('Symptoms must be a string'),
    check('short_description').optional().isString().withMessage('Short description must be a string'),
    
    // Psychiatrist-specific validation
    check('license_number').optional().isString().withMessage('License number must be a string'),
    check('qualifications').optional().isString().withMessage('Qualifications must be a string'),
    check('specialization').optional().isString().withMessage('Specialization must be a string'),
    check('years_of_experience').optional().isInt({ min: 0 }).withMessage('Years of experience must be a positive integer'),
    check('bio').optional().isString().withMessage('Bio must be a string'),
    check('availability').optional().isBoolean().withMessage('Availability must be boolean'),
    
    // Profile picture validation
    check('profile_picture').optional().isString().withMessage('Profile picture must be a base64 string')
  ],
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation errors',
        errors: errors.array() 
      });
    }
    
    // Check if trying to update email to one that already exists
    if (req.body.email) {
      const existingUser = await User.findOne({ 
        where: { 
          email: req.body.email,
          user_id: { [Op.ne]: req.params.id } // Exclude current user
        } 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already in use by another account' 
        });
      }
    }
    
    // Check if trying to update license number to one that already exists
    if (req.body.license_number) {
      const existingPsychiatrist = await Psychiatrist.findOne({ 
        where: { 
          license_number: req.body.license_number,
          psychiatrist_id: { [Op.ne]: req.params.id } // Exclude current psychiatrist
        } 
      });
      
      if (existingPsychiatrist) {
        return res.status(400).json({ 
          success: false, 
          message: 'License number already in use by another psychiatrist' 
        });
      }
    }
    
    next();
  }),
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
  validate,
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
      .withMessage('Invalid report type should be one of (UserStats, AppointmentStats, AssessmentSummary)'),
    check('format')
      .optional()
      .isIn(['pdf', 'excel', 'json'])
      .withMessage('Invalid format specified should be (pdf, excel, json)'),
    check('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO format (YYYY-MM-DD)'),
    check('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO format (YYYY-MM-DD)')
  ],
  validate,
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
  validate,
  asyncHandler(adminController.createCommunityPost)
);

module.exports = router;
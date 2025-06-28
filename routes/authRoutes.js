const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { asyncHandler } = require('../middlewares/errorHandler');
const validate = require('../middlewares/validate');
const { check } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  '/register',
  [
    check('full_name')
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ max: 100 })
      .withMessage('Full name must be less than 100 characters'),
    check('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    check('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    check('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    check('gender')
      .optional()
      .isIn(['Male', 'Female', 'Other'])
      .withMessage('Invalid gender specified'),
    check('date_of_birth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be in YYYY-MM-DD format')
  ],
  validate,
  asyncHandler(authController.registerUser)
);

/**
 * @route POST /auth/login
 * @desc Login user and return JWT token
 * @access Public
 */
router.post(
  '/login',
  [
    check('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    check('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validate,
  asyncHandler(authController.loginUser)
);

/**
 * @route POST /auth/logout
 * @desc Logout user (invalidate token)
 * @access Private
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(authController.logoutUser)
);

/**
 * @route GET /auth/me
 * @desc Get current logged in user data
 * @access Private
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(authController.getMe)
);

module.exports = router;
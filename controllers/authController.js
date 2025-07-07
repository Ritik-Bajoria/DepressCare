const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');
const { generateToken } = require('../utils/authUtils');
const { validationResult } = require('express-validator');
const  UserSession  = db.UserSession;
const User = db.User;

/**
 * @desc    Register a new user
 * @route   POST /auth/register
 * @access  Public
 */
/**
 * @desc    Register a new user
 * @route   POST /auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  // Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { full_name, email, password, address, phone, gender, date_of_birth } = req.body;
  const role = 'Patient'; // Default role for registration

  try {
    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Start a transaction
    const transaction = await db.sequelize.transaction();

    try {
      // Create user
      const user = await User.create({
        full_name,
        email,
        password_hash: hashedPassword,
        phone,
        address,
        gender,
        date_of_birth,
        role,
        profile_picture: null,
        created_at: new Date()
      }, { transaction });

      // Create corresponding Patient record with patient_id = user_id
      await db.Patient.create({
        patient_id: user.user_id, // Set patient_id to match user_id
        user_id: user.user_id,   // Also store user_id as foreign key
        previous_diagnosis: false,
        symptoms: null,
        short_description: null
      }, { transaction });

      // Generate token
      const token = generateToken(user.user_id, user.role);

      // Commit the transaction
      await transaction.commit();

      // Return response
      res.status(201).json({
        success: true,
        data: {
          user_id: user.user_id,
          patient_id: user.user_id, // Now same as user_id
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          token
        }
      });

    } catch (error) {
      // Rollback transaction if any error occurs
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific error cases
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Record login session
    await UserSession.create({
      user_id: user.user_id,
      login_time: new Date(),
      ip_address: req.ip
    });

    // Generate token
    const token = generateToken(user.user_id, user.role);

    res.json({
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * @desc    Logout user (clear token on client side)
 * @route   POST /auth/logout
 * @access  Private
 */
const logoutUser = async (req, res) => {
  try {
    // Record logout time for the current session
    const session = await UserSession.findOne({
      where: { user_id: req.user.user_id, logout_time: null },
      order: [['login_time', 'DESC']]
    });

    if (session) {
      await session.update({ logout_time: new Date() });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

/**
 * @desc    Get current logged in user profile
 * @route   GET /auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe
};
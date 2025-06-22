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
const registerUser = async (req, res) => {
  // Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { full_name, email, password, phone, gender, date_of_birth, role } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      full_name,
      email,
      password_hash: hashedPassword,
      phone,
      gender,
      date_of_birth,
      role: role || 'Patient', // Default to Patient if role not specified
      created_at: new Date()
    });

    // Generate token
    const token = generateToken(user.user_id, user.role);

    res.status(201).json({
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
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
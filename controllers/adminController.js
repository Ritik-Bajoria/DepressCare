const db = require('../models');
const { User, Psychiatrist, Report } = db;
const { generateToken } = require('../utils/authUtils');
const { validationResult } = require('express-validator');
const { generateReport } = require('../utils/reportGenerator');

/**
 * @desc    Get all users
 * @route   GET /admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user role
 * @route   PUT /admin/users/:id/role
 * @access  Private (Admin)
 */
const updateUserRole = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent modifying own admin role
    if (user.user_id === req.user.user_id && role !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot remove your own admin privileges' 
      });
    }

    user.role = role;
    await user.save();

    res.json({ 
      success: true, 
      message: 'User role updated',
      data: { user_id: user.user_id, new_role: user.role }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Enroll a new psychiatrist
 * @route   POST /admin/enroll-psychiatrist
 * @access  Private (Admin)
 */
const enrollPsychiatrist = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { user_id, license_number, qualifications, specialization, years_of_experience, bio } = req.body;

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already a psychiatrist
    const existingPsych = await Psychiatrist.findOne({ where: { psychiatrist_id: user_id } });
    if (existingPsych) {
      return res.status(400).json({ success: false, message: 'User is already a psychiatrist' });
    }

    // Update user role
    user.role = 'Psychiatrist';
    await user.save();

    // Create psychiatrist profile
    const psychiatrist = await Psychiatrist.create({
      psychiatrist_id: user_id,
      license_number,
      qualifications,
      specialization,
      years_of_experience,
      bio,
      availability: JSON.stringify({}) // Initialize empty availability
    });

    res.status(201).json({ 
      success: true, 
      message: 'Psychiatrist enrolled successfully',
      data: psychiatrist
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate reports
 * @route   GET /admin/reports/:type
 * @access  Private (Admin)
 */
const generateReports = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { format = 'pdf', startDate, endDate } = req.query;

    const reportData = await generateReport(type, { format, startDate, endDate });

    // Save report metadata to database
    const report = await Report.create({
      report_type: type,
      generated_by: req.user.user_id,
      file_url: reportData.filePath
    });

    if (format === 'json') {
      return res.json({ success: true, data: reportData.data });
    }

    res.setHeader('Content-Type', reportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${reportData.filename}`);
    res.send(reportData.file);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create community posts
 * @route   POST /admin/community-posts
 * @access  Private (Admin)
 */
const createCommunityPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, content } = req.body;

    const post = await CommunityPost.create({
      posted_by: req.user.user_id,
      title,
      content
    });

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  enrollPsychiatrist,
  generateReports,
  createCommunityPost
};
const db = require('../models');
const { User, Psychiatrist, Report, Appointment } = db;
const { generateToken } = require('../utils/authUtils');
const { validationResult } = require('express-validator');
const { generateReport } = require('../utils/reportGenerator');
const CommunityPost = db.CommunityPost;
const bcrypt = require('bcrypt');

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
 * @desc Create new user and enroll as psychiatrist
 * @route POST /admin/enroll-psychiatrist
 * @access Private (Admin)
 */
const enrollPsychiatrist = async (req, res, next) => {
  try {
    const { 
      full_name,
      email,
      password,
      phone,
      gender,
      date_of_birth,
      license_number, 
      qualifications, 
      specialization, 
      years_of_experience, 
      bio 
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already in use' 
      });
    }

    // Check if license number exists
    const existingLicense = await Psychiatrist.findOne({ where: { license_number } });
    if (existingLicense) {
      return res.status(400).json({ 
        success: false, 
        message: 'License number already in use' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create transaction for atomic operations
    await db.sequelize.transaction(async (t) => {
      // Create new user with Psychiatrist role
      const user = await User.create({
        full_name,
        email,
        password_hash: hashedPassword,
        phone,
        gender,
        date_of_birth,
        role: 'Psychiatrist'
      }, { transaction: t });

      // Create psychiatrist profile
      const psychiatrist = await Psychiatrist.create({
        psychiatrist_id: user.user_id,
        license_number,
        qualifications,
        specialization,
        years_of_experience,
        bio,
        availability: true
      }, { transaction: t });

      res.status(201).json({ 
        success: true, 
        message: 'Psychiatrist created and enrolled successfully',
        data: {
          user: {
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
          },
          psychiatrist
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create new user and enroll as internal management
 * @route POST /admin/enroll-internal
 * @access Private (Admin)
 */
const enrollInternalManagement = async (req, res, next) => {
  try {
    const { 
      full_name,
      email,
      password,
      phone,
      gender,
      date_of_birth
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already in use' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with InternalManagement role
    const user = await User.create({
      full_name,
      email,
      password_hash: hashedPassword,
      phone,
      gender,
      date_of_birth,
      role: 'InternalManagement'
    });

    // If you have a separate InternalManagement table:
    // const internal = await InternalManagement.create({
    //   user_id: user.user_id,
    //   position,
    //   department
    // });

    res.status(201).json({ 
      success: true, 
      message: 'Internal management staff created successfully',
      data: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete user and associated data based on role
 * @route DELETE /admin/users/:id
 * @access Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.user_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You cannot delete your own account' 
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Start transaction for atomic operations
    await db.sequelize.transaction(async (t) => {
      // Delete role-specific data first
      switch (user.role) {
        case 'Patient':
          await Patient.destroy({ where: { user_id: id }, transaction: t });
          break;
        case 'Psychiatrist':
          await Psychiatrist.destroy({ where: { psychiatrist_id: id }, transaction: t });
          // Also delete any appointments, prescriptions, etc.
          await Appointment.destroy({ where: { psychiatrist_id: id }, transaction: t });
          break;
        case 'InternalManagement':
          // await InternalManagement.destroy({ where: { user_id: id }, transaction: t });
          break;
      }

      // Finally delete the user
      await user.destroy({ transaction: t });
    });

    res.json({ 
      success: true, 
      message: `User (${user.role}) and all associated data deleted successfully` 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update user information
 * @route PUT /admin/users/:id
 * @access Private (Admin)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, gender, date_of_birth, role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent role change to/from Psychiatrist through this endpoint
    if (role && role !== user.role) {
      user.role = role;
    }

    // Update fields
    if (full_name) user.full_name = full_name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (gender) user.gender = gender;
    if (date_of_birth) user.date_of_birth = date_of_birth;

    await user.save();

    res.json({ 
      success: true, 
      message: 'User updated successfully',
      data: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gender: user.gender
      }
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
  enrollPsychiatrist,
  enrollInternalManagement,
  updateUser,
  deleteUser,
  generateReports,
  createCommunityPost
};
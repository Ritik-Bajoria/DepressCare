const db = require('../models');
const { User, Psychiatrist, Report, Appointment, Patient } = db;
// const { generateToken } = require('../utils/authUtils');
const { validationResult } = require('express-validator');
const { generateReport } = require('../utils/reportGenerator');
const CommunityPost = db.CommunityPost;
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');


/**
 * @desc    Get all users
 * @route   GET /admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: db.Psychiatrist,
          as: 'Psychiatrist',
          required: false,
          attributes: ['license_number', 'qualifications', 'specialization', 'years_of_experience', 'bio', 'availability']
        },
        {
          model: db.Patient,
          as: 'Patient',
          required: false,
          attributes: ['patient_id', 'previous_diagnosis', 'symptoms', 'short_description']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ 
      success: true, 
      count: users.length, 
      data: users 
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc Create new user and enroll as psychiatrist with profile picture handling
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
      profile_picture, // Added profile_picture from request body
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

    // Process profile picture if provided
    let profilePicturePath = null;
    if (profile_picture) {
      profilePicturePath = await saveProfilePicture(profile_picture);
    }

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
        profile_picture: profilePicturePath, // Save the path to the profile picture
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
            role: user.role,
            profile_picture: user.profile_picture // Include profile picture in response
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
 * Helper function to save base64 profile picture to server
 * @param {string} base64Data - Base64 encoded image data
 * @returns {string} - Path to saved image
 */
async function saveProfilePicture(base64Data) {
  try {
    // Extract the image type and data from base64 string
    const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image data');
    }

    const imageType = matches[1];
    const imageData = matches[2];
    const buffer = Buffer.from(imageData, 'base64');
    
    // Create unique filename (using timestamp)
    const timestamp = Date.now();
    const filename = `profile_${timestamp}.${imageType}`;
    const uploadDir = path.join(__dirname, '../uploads/profile_pictures');
    const filePath = path.join(uploadDir, filename);

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    fs.writeFileSync(filePath, buffer);
    
    // Return relative path to be stored in database
    return `/uploads/profile_pictures/${filename}`;
  } catch (error) {
    console.error('Error saving profile picture:', error);
    throw error;
  }
}

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
    // if (id === req.user.user_id) {
    //   return res.status(403).json({ 
    //     success: false, 
    //     message: 'You cannot delete your own account' 
    //   });
    // }

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
 * @desc Update user information with role-specific handling and image management
 * @route PUT /admin/users/:id
 * @access Private (Admin)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      full_name, 
      email, 
      phone, 
      gender, 
      date_of_birth, 
      role,
      profile_picture,
      // Patient-specific fields
      previous_diagnosis,
      symptoms,
      short_description,
      // Psychiatrist-specific fields
      license_number,
      qualifications,
      specialization,
      years_of_experience,
      bio,
      availability
    } = req.body;

    // Start transaction for atomic operations
    await db.sequelize.transaction(async (t) => {
      // Find user with associated role data
      const user = await User.findByPk(id, {
        include: [
          { model: Patient, as: 'Patient' },
          { model: Psychiatrist, as: 'Psychiatrist' }
        ],
        transaction: t
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Check for duplicate email if email is being updated
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ 
          where: { 
            email,
            user_id: { [Op.ne]: id }
          },
          transaction: t
        });
        
        if (existingUser) {
          return res.status(400).json({ 
            success: false, 
            message: 'Email already in use by another account' 
          });
        }
      }

      // Check for duplicate license number if updating psychiatrist
      if (license_number && user.Psychiatrist && license_number !== user.Psychiatrist.license_number) {
        const existingPsychiatrist = await Psychiatrist.findOne({ 
          where: { 
            license_number,
            psychiatrist_id: { [Op.ne]: id }
          },
          transaction: t
        });
        
        if (existingPsychiatrist) {
          return res.status(400).json({ 
            success: false, 
            message: 'License number already in use by another psychiatrist' 
          });
        }
      }

      // Handle profile picture update if provided
      let profilePicturePath = user.profile_picture;
      if (profile_picture) {
        // Delete old profile picture if it exists
        if (profilePicturePath) {
          await deleteProfilePicture(profilePicturePath);
        }
        // Save new profile picture
        profilePicturePath = await saveProfilePicture(profile_picture);
      }

      // Update basic user fields
      if (full_name) user.full_name = full_name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      if (gender) user.gender = gender;
      if (date_of_birth) user.date_of_birth = date_of_birth;
      if (profilePicturePath) user.profile_picture = profilePicturePath;

      // Handle role change if requested
      if (role && role !== user.role) {
        // Validate role change logic here if needed
        user.role = role;
      }

      await user.save({ transaction: t });

      // Handle role-specific updates
      if (user.role === 'Patient') {
        if (user.Patient) {
          // Update existing patient record
          if (previous_diagnosis !== undefined) user.Patient.previous_diagnosis = previous_diagnosis;
          if (symptoms) user.Patient.symptoms = symptoms;
          if (short_description) user.Patient.short_description = short_description;
          await user.Patient.save({ transaction: t });
        } else {
          // Create new patient record if doesn't exist
          await Patient.create({
            user_id: user.user_id,
            previous_diagnosis: previous_diagnosis || false,
            symptoms: symptoms || null,
            short_description: short_description || null
          }, { transaction: t });
        }
      } 
      else if (user.role === 'Psychiatrist') {
        if (user.Psychiatrist) {
          // Update existing psychiatrist record
          if (license_number) user.Psychiatrist.license_number = license_number;
          if (qualifications) user.Psychiatrist.qualifications = qualifications;
          if (specialization) user.Psychiatrist.specialization = specialization;
          if (years_of_experience) user.Psychiatrist.years_of_experience = years_of_experience;
          if (bio) user.Psychiatrist.bio = bio;
          if (availability !== undefined) user.Psychiatrist.availability = availability;
          await user.Psychiatrist.save({ transaction: t });
        } else {
          // Create new psychiatrist record if doesn't exist
          await Psychiatrist.create({
            psychiatrist_id: user.user_id,
            license_number: license_number || null,
            qualifications: qualifications || null,
            specialization: specialization || null,
            years_of_experience: years_of_experience || 0,
            bio: bio || null,
            availability: availability !== undefined ? availability : true
          }, { transaction: t });
        }
      }

      // Fetch updated user with associations
      const updatedUser = await User.findByPk(id, {
        include: [
          { model: Patient, as: 'Patient' },
          { model: Psychiatrist, as: 'Psychiatrist' }
        ],
        transaction: t
      });

      res.json({ 
        success: true, 
        message: 'User updated successfully',
        data: formatUserResponse(updatedUser)
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to format user response
 */
function formatUserResponse(user) {
  const response = {
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    date_of_birth: user.date_of_birth,
    role: user.role,
    profile_picture: user.profile_picture,
    created_at: user.created_at
  };

  // Include role-specific data
  if (user.role === 'Patient' && user.Patient) {
    response.patient = {
      previous_diagnosis: user.Patient.previous_diagnosis,
      symptoms: user.Patient.symptoms,
      short_description: user.Patient.short_description
    };
  } else if (user.role === 'Psychiatrist' && user.Psychiatrist) {
    response.psychiatrist = {
      license_number: user.Psychiatrist.license_number,
      qualifications: user.Psychiatrist.qualifications,
      specialization: user.Psychiatrist.specialization,
      years_of_experience: user.Psychiatrist.years_of_experience,
      bio: user.Psychiatrist.bio,
      availability: user.Psychiatrist.availability
    };
  }

  return response;
}
/**
 * Helper function to delete profile picture
 */
async function deleteProfilePicture(filePath) {
  try {
    if (filePath) {
      const fullPath = path.join(__dirname, '../..', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    // Don't throw error as we don't want to fail the whole operation
  }
}

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
const db = require('../models');
const { CommunityPost, JobPosting, User } = db;
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Helper function to save images
async function savePicture(base64Data, type) {
  try {
    const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image data');
    }

    const imageType = matches[1];
    const imageData = matches[2];
    const buffer = Buffer.from(imageData, 'base64');
    
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `${type}_${timestamp}_${randomStr}.${imageType}`;
    const uploadDir = path.join(__dirname, '../uploads', type);
    const filePath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);
    
    return `/uploads/${type}/${filename}`;
  } catch (error) {
    console.error(`Error saving ${type} picture:`, error);
    throw error;
  }
}

// Community Post Controllers
const getAllCommunityPosts = async (req, res, next) => {
  try {
    const { category, search, sortBy = 'newest', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` }},
        { content: { [Op.iLike]: `%${search}%` }}
      ];
    }
    
    const order = sortBy === 'oldest' ? [['posted_at', 'ASC']] : [['posted_at', 'DESC']];
    
    const { count, rows: posts } = await CommunityPost.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [{
        model: User,
        as: 'Author',
        attributes: ['user_id', 'full_name', 'profile_picture']
      }],
      distinct: true  // Important for correct counting with includes
    });
    
    res.json({
      success: true,
      data: posts,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        perPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching community posts:', error);
    next(error);
  }
};

const getCommunityPostById = async (req, res, next) => {
  try {
    const post = await CommunityPost.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'Author',
        attributes: ['user_id', 'full_name', 'profile_picture']
      }]
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Community post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
};

const updateCommunityPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, category, picture } = req.body;

    const post = await CommunityPost.findByPk(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Community post not found'
      });
    }

    // Handle picture update
    let picture_url = post.picture_url;
    if (picture) {
      // Delete old picture if exists
      if (picture_url) {
        try {
          await unlink(path.join(__dirname, '..', picture_url));
        } catch (err) {
          console.error('Error deleting old picture:', err);
        }
      }
      picture_url = await savePicture(picture, 'community');
    }

    await post.update({
      title: title || post.title,
      content: content || post.content,
      category: category || post.category,
      picture_url
    });

    res.json({
      success: true,
      message: 'Community post updated successfully',
      data: post
    });
  } catch (error) {
    next(error);
  }
};

const deleteCommunityPost = async (req, res, next) => {
  try {
    const post = await CommunityPost.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Community post not found'
      });
    }

    // Delete associated picture
    if (post.picture_url) {
      try {
        await unlink(path.join(__dirname, '..', post.picture_url));
      } catch (err) {
        console.error('Error deleting picture:', err);
      }
    }

    await post.destroy();
    res.json({
      success: true,
      message: 'Community post deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Job Posting Controllers
const getAllJobPostings = async (req, res, next) => {
  try {
    const { search, sortBy = 'newest', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` }},
        { description: { [Op.iLike]: `%${search}%` }},
        { requirements: { [Op.iLike]: `%${search}%` }}
      ];
    }
    
    const order = sortBy === 'oldest' ? [['posted_at', 'ASC']] : [['posted_at', 'DESC']];
    
    const { count, rows: jobs } = await JobPosting.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [{
        model: User,
        as: 'poster',
        attributes: ['user_id', 'full_name', 'profile_picture']
      }]
    });
    
    res.json({
      success: true,
      data: jobs,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        perPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getJobPostingById = async (req, res, next) => {
  try {
    const job = await JobPosting.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'poster',
        attributes: ['user_id', 'full_name', 'profile_picture']
      }]
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

const updateJobPosting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, requirements, picture } = req.body;

    const job = await JobPosting.findByPk(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found'
      });
    }

    // Handle picture update
    let picture_url = job.picture_url;
    if (picture) {
      // Delete old picture if exists
      if (picture_url) {
        try {
          await unlink(path.join(__dirname, '..', picture_url));
        } catch (err) {
          console.error('Error deleting old picture:', err);
        }
      }
      picture_url = await savePicture(picture, 'jobs');
    }

    await job.update({
      title: title || job.title,
      description: description || job.description,
      requirements: requirements || job.requirements,
      picture_url
    });

    res.json({
      success: true,
      message: 'Job posting updated successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
};

const deleteJobPosting = async (req, res, next) => {
  try {
    const job = await JobPosting.findByPk(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found'
      });
    }

    // Delete associated picture
    if (job.picture_url) {
      try {
        await unlink(path.join(__dirname, '=..', job.picture_url));
      } catch (err) {
        console.error('Error deleting picture:', err);
      }
    }

    await job.destroy();
    res.json({
      success: true,
      message: 'Job posting deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCommunityPosts,
  getCommunityPostById,
  updateCommunityPost,
  deleteCommunityPost,
  getAllJobPostings,
  getJobPostingById,
  updateJobPosting,
  deleteJobPosting
};
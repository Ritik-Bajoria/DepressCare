const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const roleMiddleware = require('../middlewares/roleMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route   GET /api/post/community
 * @desc    Get all community posts
 * @access  Public
 * @query   {string} [category] - Filter by category
 * @query   {string} [search] - Search in title and content
 * @query   {string} [sortBy] - Sort by ('newest', 'oldest', 'popular')
 * @query   {number} [page=1] - Page number
 * @query   {number} [limit=10] - Items per page
 */
router.get('/community', postController.getAllCommunityPosts);

/**
 * @route   GET /api/post/community/:id
 * @desc    Get a single community post by ID
 * @access  Public
 */
router.get('/community/:id', postController.getCommunityPostById);

/**
 * @route   patch /api/post/community/:id
 * @desc    Update a community post
 * @access  Private (Post owner or Admin)
 */
router.patch(
  '/community/:id',
  authMiddleware,
  roleMiddleware(['InternalManagement']),
  postController.updateCommunityPost
);

/**
 * @route   DELETE /api/post/community/:id
 * @desc    Delete a community post
 * @access  Private (Post owner or Admin)
 */
router.delete(
  '/community/:id',
  authMiddleware,
  roleMiddleware(['InternalManagement']),
  postController.deleteCommunityPost
);


/**
 * @route   GET /api/jobs
 * @desc    Get all job postings
 * @access  Public
 * @query   {string} [search] - Search in title and description
 * @query   {string} [sortBy] - Sort by ('newest', 'oldest')
 * @query   {number} [page=1] - Page number
 * @query   {number} [limit=10] - Items per page
 */
router.get('/job', postController.getAllJobPostings);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get a single job posting by ID
 * @access  Public
 */
router.get('/job/:id', postController.getJobPostingById);

/**
 * @route   patch /api/jobs/:id
 * @desc    Update a job posting
 * @access  Private (Internal Management)
 */
router.patch(
  '/job/:id',
  authMiddleware,
  roleMiddleware(['InternalManagement']),
  postController.updateJobPosting
);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job posting
 * @access  Private (Internal Management)
 */
router.delete(
  '/job/:id',
  authMiddleware,
  roleMiddleware(['InternalManagement']),
  postController.deleteJobPosting
);

module.exports = router;
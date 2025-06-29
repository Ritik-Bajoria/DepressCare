const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const roleMiddleware = require('../middlewares/roleMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../middlewares/errorHandler');
const { check } = require('express-validator');
const validate = require('../middlewares/validate');

// Public routes
router.get('/questions', formController.getFormQuestions);

router.post(
  '/questions',
  roleMiddleware(['admin', 'Psychiatrist', 'InternalManagement']),
  [
    check('question_text').notEmpty().withMessage('Question text is required'),
    check('score_type')
      .isIn(['Likert', 'Binary', 'Scale'])
      .withMessage('Score type must be one of: Likert, Binary, Scale')
  ],
  validate,
  asyncHandler(formController.addQuestion)
);

router.get('/history', 
  authMiddleware, 
  roleMiddleware(['Patient']), 
  formController.getFormHistory
);

// Shared patient/psychiatrist routes
router.get('/:id', 
  authMiddleware, 
  roleMiddleware(['Patient', 'Psychiatrist']), 
  formController.getFormDetails
);

module.exports = router;
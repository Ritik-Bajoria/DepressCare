const express = require('express');
const authRouter = express.Router();
require('dotenv').config();
const authController = require('../controllers/authController')

// Routes to authentication
authRouter.route('/register')
    .post(authController.registerUser);

authRouter.route('/login')
    .post(authController.loginUser)

authRouter.route('/logout') 
    .post(authController.logoutUser)

authRouter.route('/me')
    .get(authController.getMe)


module.exports = authRouter;
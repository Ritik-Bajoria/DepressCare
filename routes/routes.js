const express = require('express');
const router = express.Router();
require('dotenv').config();

// Routes to login
router.route('/login')
    .get(auth.getLogin)
    .post(auth.userLoginController);

module.exports = router;
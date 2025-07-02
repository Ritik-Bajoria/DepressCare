const express = require('express');
const router = express.Router();
const authRouter = require('./authRoutes');
const adminRouter = require('./adminRoutes');
const patientRouter = require('./patientRoutes');
const psychiatristRouter = require('./psychiatristRoutes');
const internalRouter = require('./internalRoutes');
const formRouter = require('./formRoutes');   
const postRouter = require('./postRoutes')

//connect to routers
router.use('/auth', authRouter);
router.use('/admin',adminRouter);
router.use('/patient',patientRouter);
router.use('/psychiatrist',psychiatristRouter);
router.use('/internal',internalRouter);
router.use('/form',formRouter);
router.use('/post',postRouter);

module.exports = router;

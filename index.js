const express = require('express');
const app = express();
require('dotenv').config();
const morgan = require('morgan'); // <-- Added Morgan
const cors = require('cors'); 
const logger = require('./controllers/logger');
const db = require('./models');
const path = require('path');
const authRouter = require('./routes/authRoutes');
const adminRouter = require('./routes/adminRoutes');
const patientRouter = require('./routes/patientRoutes');
const psychiatristRouter = require('./routes/psychiatristRoutes');
const authMiddleware = require('./middlewares/authMiddleware');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middlewares/errorHandler');

// Middleware to parse JSON Request Bodies
// app.use(express.json());
// // Midddleware to parse URL-encoded Request Bodies
// app.use(express.urlencoded({ extended: false }));
// Increase payload size limit (e.g., 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: 'http://localhost:5173'
}));

// Serve static files from /uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(morgan('dev')); 
// Middleware to create logs
app.use((req, res, next) => {
  logger.info(`Request from ${req.ip} at ${req.method} ${req.originalUrl}`);
  next();
});

// authentication middleware
app.use(authMiddleware);

//connect to routers
app.use('/api/auth', authRouter);
app.use('/api/admin',adminRouter);
app.use('/api/patient',patientRouter);
app.use('/api/psychiatrist',psychiatristRouter);

app.use(notFoundHandler);
app.use(errorHandler);


// Connect to the server
server = app.listen(process.env.port,'0.0.0.0' ,() => {
    logger.info(`Server is listening on port ${process.env.port}`);
});
db.sequelize.authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
    // Then start your server here, e.g. app.listen(...)
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);  // Exit if connection fails
  });

// Graceful shutdown handler
const shutdown = (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  server.close(() => {
    logger.info('HTTP server closed');

    db.sequelize.close().then(() => {
      logger.info("Sequelize connection closed");
      process.exit(0);
    }).catch(err => {
      logger.error("Error closing Sequelize connection:", err);
      process.exit(1);
    });
  });
};

// Handle process termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

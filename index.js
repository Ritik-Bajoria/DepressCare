const express = require('express');
const app = express();
require('dotenv').config();
const logger = require('./controllers/logger');
const db = require('./models');
const authRouter = require('./routes/authRouter');
const authMiddleware = require('./middlewares/authMiddleware')

// Middleware to parse JSON Request Bodies
app.use(express.json());
// Midddleware to parse URL-encoded Request Bodies
app.use(express.urlencoded({ extended: false }));

// Middleware to create logs
app.use((req, res, next) => {
  logger.info(`Request from ${req.ip} at ${req.method} ${req.originalUrl}`);
  next();
});

// authentication middleware
app.use(authMiddleware);

//connect to routers
app.use('/api/auth', authRouter);

// Connect to the server
server = app.listen(process.env.port, () => {
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

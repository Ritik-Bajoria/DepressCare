const express = require('express');
const app = express();
require('dotenv').config();
const logger = require('./controllers/logger');

// Middleware to parse JSON Request Bodies
app.use(express.json());
// Midddleware to parse URL-encoded Request Bodies
app.use(express.urlencoded({ extended: false }));

// Middleware to create logs
app.use((req, res, next) => {
  logger.info(`Request from ${req.ip} at ${req.method} ${req.originalUrl}`);
  next();
});

// Connect to the server
server = app.listen(process.env.port, () => {
  logger.info(`Server is listening on port ${process.env.port}`);
});

// //gracefull shutdown, term signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info("mongoose connection is closed");
      process.exit(0);
    });
  });
});

const shutdown = () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    mongoose.disconnect()
      .then(() => {
        logger.info("Mongoose connection is closed");
        logger.warn('HTTP server closed\n');
        process.exit(0);
      })
  });
}

process.on('SIGINT', shutdown);

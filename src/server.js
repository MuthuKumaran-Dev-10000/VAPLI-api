const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = require('./app');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT || '8081', 10);
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`=================================================`);
  logger.info(` VAPLI Express API Server running on ${HOST}:${PORT}`);
  logger.info(` Health check: http://127.0.0.1:${PORT}/health`);
  logger.info(` Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`=================================================`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason: reason?.message || reason, stack: reason?.stack });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
});

module.exports = server;

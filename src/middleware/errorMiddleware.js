const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  logger.error(`API Error Handler caught exception: [${statusCode}] ${err.message}`, {
    path: req.originalUrl,
    method: req.method,
    code: errorCode,
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
}

module.exports = errorHandler;

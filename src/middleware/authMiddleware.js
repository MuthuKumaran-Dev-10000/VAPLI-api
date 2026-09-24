const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    logger.warn('Authentication failed: Missing Authorization Bearer token', { path: req.originalUrl, ip: req.ip });
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing or invalid'
      }
    });
  }

  const secret = process.env.JWT_SECRET || 'vapli_jwt_secret_key_super_secure_2026!';
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      logger.warn('Authentication failed: Invalid token signature or expired', { path: req.originalUrl, error: err.message });
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Authentication token is invalid or has expired'
        }
      });
    }

    req.user = decoded;
    logger.debug('Authenticated user context', { userId: decoded.userId, role: decoded.role });
    next();
  });
}

function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next();
  }

  const secret = process.env.JWT_SECRET || 'vapli_jwt_secret_key_super_secure_2026!';
  jwt.verify(token, secret, (err, decoded) => {
    if (!err && decoded) {
      req.user = decoded;
    }
    next();
  });
}

module.exports = { authenticateToken, optionalAuthenticateToken };

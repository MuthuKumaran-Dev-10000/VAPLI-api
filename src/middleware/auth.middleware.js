const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../core/errors');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header token');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'vapli_jwt_secret_key_super_secure_2026!';
    const decoded = jwt.verify(token, secret);

    req.user = {
      id: decoded.id,
      username: decoded.username,
      fullName: decoded.fullName,
      role: decoded.role,
      roleRank: decoded.roleRank,
      clientIds: decoded.clientIds || [],
      privileges: decoded.privileges || {}
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Session expired or invalid token'));
    }
    next(err);
  }
}

module.exports = { authMiddleware };

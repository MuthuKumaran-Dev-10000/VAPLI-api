const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const cryptoUtil = require('../utils/crypto');
const logger = require('../utils/logger');

class AuthService {
  async login(username, password) {
    if (!username || !password) {
      throw { statusCode: 400, code: 'INVALID_CREDENTIALS', message: 'Username and password are required' };
    }

    const user = await userRepository.findByUsername(username);
    if (!user) {
      logger.warn(`Login attempt for non-existent user: ${username}`);
      throw { statusCode: 401, code: 'AUTH_FAILED', message: 'Invalid username or password' };
    }

    if (!user.is_active) {
      logger.warn(`Login attempt for deactivated user: ${username}`);
      throw { statusCode: 403, code: 'ACCOUNT_DEACTIVATED', message: 'Account is deactivated' };
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      logger.warn(`Login attempt for locked account: ${username}`);
      throw { statusCode: 403, code: 'ACCOUNT_LOCKED', message: `Account locked until ${user.locked_until}` };
    }

    const isValid = cryptoUtil.verifyPassword(password, user.password_hash, user.extra_json?.password_hash);
    if (!isValid) {
      await userRepository.recordLoginFailure(user.id);
      logger.warn(`Invalid password for user: ${username}`);
      throw { statusCode: 401, code: 'AUTH_FAILED', message: 'Invalid username or password' };
    }

    await userRepository.recordLoginSuccess(user.id);

    const clients = await userRepository.getUserClients(user.id);

    const secret = process.env.JWT_SECRET || 'vapli_jwt_secret_key_super_secure_2026!';
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        clientIds: clients.map(c => c.id)
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info(`User logged in successfully: ${username} (Role: ${user.role})`);

    const { password_hash, ...userClean } = user;
    return {
      token,
      user: userClean,
      clients
    };
  }
}

module.exports = new AuthService();

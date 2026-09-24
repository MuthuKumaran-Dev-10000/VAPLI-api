const userRepository = require('../repositories/userRepository');
const cryptoUtil = require('../utils/crypto');

class UserService {
  async getUsers() {
    return await userRepository.findAll();
  }

  async getUserById(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: `User '${userId}' not found` };
    }
    const { password_hash, ...userClean } = user;
    return userClean;
  }

  async createUser(userData) {
    if (!userData.username || !userData.password) {
      throw { statusCode: 400, code: 'INVALID_INPUT', message: 'Username and password are required' };
    }
    const existing = await userRepository.findByUsername(userData.username);
    if (existing) {
      throw { statusCode: 409, code: 'USER_EXISTS', message: `Username '${userData.username}' is already taken` };
    }
    const id = userData.id || 'usr_' + Date.now();
    const hash = cryptoUtil.hashPassword(userData.password);
    await userRepository.create({ ...userData, id, password_hash: hash });
    return await this.getUserById(id);
  }

  async updateUser(userId, updates) {
    await this.getUserById(userId);
    if (updates.password) {
      updates.password_hash = cryptoUtil.hashPassword(updates.password);
      delete updates.password;
    }
    await userRepository.update(userId, updates);
    return await this.getUserById(userId);
  }

  async deleteUser(userId) {
    await this.getUserById(userId);
    await userRepository.delete(userId);
  }
}

module.exports = new UserService();

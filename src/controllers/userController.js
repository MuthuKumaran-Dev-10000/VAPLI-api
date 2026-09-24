const userService = require('../services/userService');

class UserController {
  async getUsers(req, res, next) {
    try {
      const users = await userService.getUsers();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.userId);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async createUser(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async updateUser(req, res, next) {
    try {
      const user = await userService.updateUser(req.params.userId, req.body);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req, res, next) {
    try {
      await userService.deleteUser(req.params.userId);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();

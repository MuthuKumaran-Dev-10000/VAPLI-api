const authService = require('./auth.service');
const { successResponse } = require('../../core/response');

async function loginController(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    return successResponse(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function logoutController(req, res, next) {
  try {
    return successResponse(res, { message: 'Logged out successfully' }, 200);
  } catch (err) {
    next(err);
  }
}

async function getMeController(req, res, next) {
  try {
    return successResponse(res, { user: req.user }, 200);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  loginController,
  logoutController,
  getMeController
};

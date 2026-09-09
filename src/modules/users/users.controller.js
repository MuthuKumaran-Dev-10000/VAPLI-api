const usersService = require('./users.service');
const { successResponse } = require('../../core/response');

async function listUsersController(req, res, next) {
  try {
    const data = await usersService.listUsers(req.user);
    return successResponse(res, data, 200);
  } catch (err) {
    next(err);
  }
}

async function getUserController(req, res, next) {
  try {
    const user = await usersService.getUser(req.params.id, req.user);
    return successResponse(res, { user }, 200);
  } catch (err) {
    next(err);
  }
}

async function createUserController(req, res, next) {
  try {
    const user = await usersService.createUser(req.body, req.user);
    return successResponse(res, { user }, 201);
  } catch (err) {
    next(err);
  }
}

async function updateUserController(req, res, next) {
  try {
    const user = await usersService.updateUser(req.params.id, req.body, req.user);
    return successResponse(res, { user }, 200);
  } catch (err) {
    next(err);
  }
}

async function deleteUserController(req, res, next) {
  try {
    const result = await usersService.deleteUser(req.params.id, req.user);
    return successResponse(res, result, 200);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController
};

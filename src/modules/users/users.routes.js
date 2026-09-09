const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../../middleware/rbac.middleware');

router.use(authMiddleware);

router.get('/', requirePermission('view_admin_users'), usersController.listUsersController);
router.get('/:id', usersController.getUserController);
router.post('/', requireRole(2), requirePermission('create_users'), usersController.createUserController);
router.patch('/:id', requireRole(2), usersController.updateUserController);
router.delete('/:id', requireRole(2), usersController.deleteUserController);

module.exports = router;

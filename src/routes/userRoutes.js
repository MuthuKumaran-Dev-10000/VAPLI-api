const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', userController.getUsers.bind(userController));
router.post('/', userController.createUser.bind(userController));
router.get('/:userId', userController.getUserById.bind(userController));
router.put('/:userId', userController.updateUser.bind(userController));
router.delete('/:userId', userController.deleteUser.bind(userController));

module.exports = router;

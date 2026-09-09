const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.post('/login', authController.loginController);
router.post('/logout', authMiddleware, authController.logoutController);
router.get('/me', authMiddleware, authController.getMeController);

module.exports = router;

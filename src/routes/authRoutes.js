const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/login', authController.login.bind(authController));
router.get('/me', authenticateToken, authController.me.bind(authController));
router.post('/logout', authenticateToken, authController.logout.bind(authController));

module.exports = router;

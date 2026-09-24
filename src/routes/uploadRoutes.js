const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadController = require('../controllers/uploadController');
const { optionalAuthenticateToken } = require('../middleware/authMiddleware');

const tempUpload = multer({ dest: path.join(__dirname, '../../uploads/temp') });

router.post('/:category?', optionalAuthenticateToken, tempUpload.single('file'), uploadController.handleUpload.bind(uploadController));

module.exports = router;

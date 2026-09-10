const express = require('express');
const router = express.Router();
const readingsController = require('./readings.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/', readingsController.saveReadingController);
router.get('/', readingsController.getReadingsController);

module.exports = router;

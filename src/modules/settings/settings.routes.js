const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', settingsController.getAllSettingsController);
router.post('/bulk', settingsController.bulkSaveSettingsController);
router.get('/:key(*)', settingsController.getSettingByKeyController);
router.put('/:key(*)', settingsController.saveSettingController);
router.post('/:key(*)', settingsController.saveSettingController);

module.exports = router;

const settingsService = require('./settings.service');
const { successResponse } = require('../../core/response');
const auditService = require('../audit/audit.service');

class SettingsController {
  async getAllSettingsController(req, res, next) {
    try {
      const settings = await settingsService.getAllSettings();
      return successResponse(res, { settings }, 200);
    } catch (e) {
      next(e);
    }
  }

  async getSettingByKeyController(req, res, next) {
    try {
      const key = req.params.key || req.query.key;
      const value = await settingsService.getSetting(key);
      return successResponse(res, { key, value }, 200);
    } catch (e) {
      next(e);
    }
  }

  async saveSettingController(req, res, next) {
    try {
      const key = req.params.key || req.body.key;
      const value = req.body.value !== undefined ? req.body.value : req.body;
      const beforeState = await settingsService.getSetting(key);
      const updated = await settingsService.saveSetting(key, value);

      await auditService.logAction({
        req,
        entityType: 'setting',
        entityId: key,
        operation: 'update',
        beforeState,
        afterState: updated
      });

      return successResponse(res, { key, value: updated }, 200);
    } catch (e) {
      next(e);
    }
  }

  async bulkSaveSettingsController(req, res, next) {
    try {
      const settingsMap = req.body.settings || req.body;
      const updated = await settingsService.bulkSaveSettings(settingsMap);

      await auditService.logAction({
        req,
        entityType: 'setting',
        entityId: 'bulk',
        operation: 'update',
        afterState: updated
      });

      return successResponse(res, { settings: updated }, 200);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new SettingsController();

const readingsService = require('./readings.service');
const { successResponse } = require('../../core/response');
const auditService = require('../audit/audit.service');

class ReadingsController {
  async saveReadingController(req, res, next) {
    try {
      const reading = await readingsService.saveReading(req.body);
      await auditService.logAction({
        req,
        entityType: 'reading',
        entityId: reading.id,
        operation: 'create',
        afterState: reading
      });
      return successResponse(res, { reading }, 201);
    } catch (e) {
      next(e);
    }
  }

  async getReadingsController(req, res, next) {
    try {
      const readings = await readingsService.getReadings(req.query);
      return successResponse(res, { readings }, 200);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new ReadingsController();

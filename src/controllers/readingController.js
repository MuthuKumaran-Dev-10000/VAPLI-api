const readingService = require('../services/readingService');

class ReadingController {
  async getReadings(req, res, next) {
    try {
      const options = {
        tankId: req.params.tankId || req.query.tankId,
        limit: req.query.limit
      };
      const readings = await readingService.getReadings(req.params.clientId, options);
      res.json({ success: true, data: readings });
    } catch (err) {
      next(err);
    }
  }

  async getLastReading(req, res, next) {
    try {
      const reading = await readingService.getLastReadingForTank(req.params.clientId, req.params.tankId);
      res.json({ success: true, data: reading });
    } catch (err) {
      next(err);
    }
  }

  async getPreviousCapture(req, res, next) {
    try {
      const capture = await readingService.getPreviousCapture(req.params.clientId, req.params.tankId, req.params.parameterId);
      res.json({ success: true, data: capture });
    } catch (err) {
      next(err);
    }
  }

  async submitReading(req, res, next) {
    try {
      const result = await readingService.submitReading(
        req.params.clientId,
        req.params.tankId,
        req.body,
        req.user
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReadingController();

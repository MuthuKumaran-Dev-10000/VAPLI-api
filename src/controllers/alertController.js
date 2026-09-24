const alertService = require('../services/alertService');

class AlertController {
  async getAlerts(req, res, next) {
    try {
      const options = {
        status: req.query.status,
        tankId: req.query.tankId,
        limit: req.query.limit
      };
      const alerts = await alertService.getAlerts(req.params.clientId, options);
      res.json({ success: true, data: alerts });
    } catch (err) {
      next(err);
    }
  }

  async getViolations(req, res, next) {
    try {
      const options = { status: req.query.status };
      const violations = await alertService.getViolations(req.params.clientId, options);
      res.json({ success: true, data: violations });
    } catch (err) {
      next(err);
    }
  }

  async acknowledgeAlert(req, res, next) {
    try {
      const result = await alertService.acknowledgeAlert(req.params.clientId, req.params.alertId, req.user);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async resolveAlert(req, res, next) {
    try {
      const result = await alertService.resolveAlert(req.params.clientId, req.params.alertId, req.body, req.user);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async updateAlert(req, res, next) {
    try {
      const result = await alertService.updateAlert(req.params.clientId, req.params.alertId, req.body, req.user);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async createCompletedTask(req, res, next) {
    try {
      const result = await alertService.createCompletedTask(req.params.clientId, req.body, req.user);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getCompletedTasks(req, res, next) {
    try {
      const tasks = await alertService.getCompletedTasks(req.params.clientId);
      res.json({ success: true, data: tasks });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AlertController();

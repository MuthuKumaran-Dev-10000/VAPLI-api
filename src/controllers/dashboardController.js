const dashboardService = require('../services/dashboardService');

class DashboardController {
  async getDashboardStats(req, res, next) {
    try {
      const stats = await dashboardService.getDashboardStats(req.params.clientId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async getDashboardTrends(req, res, next) {
    try {
      const trends = await dashboardService.getDashboardTrends(req.params.clientId, req.query.tankId);
      res.json({ success: true, data: trends });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();

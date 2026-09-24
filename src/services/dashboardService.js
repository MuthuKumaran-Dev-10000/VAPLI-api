const dashboardRepository = require('../repositories/dashboardRepository');

class DashboardService {
  async getDashboardStats(clientId) {
    return await dashboardRepository.getDashboardStats(clientId);
  }

  async getDashboardTrends(clientId, tankId) {
    return await dashboardRepository.getDashboardTrends(clientId, tankId);
  }
}

module.exports = new DashboardService();

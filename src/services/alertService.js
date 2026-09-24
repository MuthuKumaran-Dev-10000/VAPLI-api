const alertRepository = require('../repositories/alertRepository');
const logger = require('../utils/logger');

class AlertService {
  async getAlerts(clientId, options) {
    return await alertRepository.getAlerts(clientId, options);
  }

  async getViolations(clientId, options) {
    return await alertRepository.getViolations(clientId, options);
  }

  async acknowledgeAlert(clientId, alertId, userContext) {
    logger.info(`Acknowledging alert ${alertId} for client ${clientId}`);
    await alertRepository.updateAlertStatus(clientId, alertId, {
      acknowledged: 1,
      status: 'acknowledged'
    });
    return { success: true };
  }

  async resolveAlert(clientId, alertId, resolutionData, userContext) {
    logger.info(`Resolving alert ${alertId} for client ${clientId}`);
    await alertRepository.updateAlertStatus(clientId, alertId, {
      status: 'resolved',
      live: 0,
      resolved_at: new Date(),
      resolved_by: userContext ? userContext.userId : null,
      resolved_description: resolutionData.description || null
    });

    // Create completed task entry
    const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await alertRepository.createCompletedTask({
      id: taskId,
      client_id: clientId,
      alert_id: alertId,
      completed_by: userContext ? userContext.userId : null,
      completed_by_name: userContext ? (userContext.username || userContext.name) : null,
      description: resolutionData.description || 'Alert resolved',
      photo_urls: resolutionData.photo_urls || []
    });

    return { success: true, taskId };
  }

  async getCompletedTasks(clientId) {
    return await alertRepository.getCompletedTasks(clientId);
  }
}

module.exports = new AlertService();

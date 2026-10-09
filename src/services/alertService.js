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

  async updateAlert(clientId, alertId, updateData, userContext) {
    logger.info(`Updating alert ${alertId} for client ${clientId}`);
    await alertRepository.updateAlertStatus(clientId, alertId, updateData);
    return { success: true };
  }

  async createCompletedTask(clientId, taskData, userContext) {
    logger.info(`Creating completed task for client ${clientId}`);
    const taskId = taskData.id || ('task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const photoUrls = taskData.completed_photo_urls || taskData.photo_urls || (taskData.completed_photo_url ? [taskData.completed_photo_url] : []);
    await alertRepository.createCompletedTask({
      id: taskId,
      client_id: clientId,
      alert_id: taskData.alert_id || null,
      completed_by: userContext ? userContext.userId : null,
      completed_by_name: taskData.completed_by || (userContext ? (userContext.username || userContext.name) : 'Inspector'),
      description: taskData.completed_description || taskData.description || 'Task completed',
      photo_urls: photoUrls,
      alert: taskData.alert || null,
    });
    return { success: true, id: taskId };
  }

  async getCompletedTasks(clientId) {
    const rows = await alertRepository.getCompletedTasks(clientId);
    return rows.map((r) => {
      let photoUrls = [];
      if (r.photo_urls_json) {
        try {
          photoUrls = typeof r.photo_urls_json === 'string'
            ? JSON.parse(r.photo_urls_json)
            : r.photo_urls_json;
        } catch (_) {
          photoUrls = [];
        }
      }
      if (!Array.isArray(photoUrls)) photoUrls = [];

      let alert = null;
      if (r.alert_json) {
        try {
          const parsed = typeof r.alert_json === 'string' ? JSON.parse(r.alert_json) : r.alert_json;
          alert = parsed.alert || parsed;
        } catch (_) {}
      }

      let alertExtra = {};
      if (r.alert_extra_json) {
        try {
          alertExtra = typeof r.alert_extra_json === 'string'
            ? JSON.parse(r.alert_extra_json)
            : r.alert_extra_json;
        } catch (_) {}
      }

      if (!alert || typeof alert !== 'object') alert = {};

      if (!alert.image_url) {
        alert.image_url = r.alert_capture_image_url || alertExtra.image_url || '';
      }
      if (!alert.capture_image_url && r.alert_capture_image_url) {
        alert.capture_image_url = r.alert_capture_image_url;
      }

      const firstPhoto = photoUrls.length > 0 ? photoUrls[0] : '';

      return {
        id: r.id,
        alert_id: r.alert_id,
        completed_at: r.completed_at,
        completed_by: r.completed_by_name || r.completed_by || '',
        completed_description: r.description || alert.completed_description || '',
        completed_photo_url: firstPhoto || alert.completed_photo_url || '',
        completed_photo_urls: photoUrls.length > 0
          ? photoUrls
          : (alert.completed_photo_urls || (alert.completed_photo_url ? [alert.completed_photo_url] : [])),
        alert,
      };
    });
  }
}

module.exports = new AlertService();

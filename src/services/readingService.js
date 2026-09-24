const readingRepository = require('../repositories/readingRepository');
const tankRepository = require('../repositories/tankRepository');
const logger = require('../utils/logger');

class ReadingService {
  async getReadings(clientId, options) {
    return await readingRepository.getReadings(clientId, options);
  }

  async getLastReadingForTank(clientId, tankId) {
    return await readingRepository.getLastReadingForTank(clientId, tankId);
  }

  async getPreviousCapture(clientId, tankId, parameterId) {
    return await readingRepository.getPreviousCapture(clientId, tankId, parameterId);
  }

  async submitReading(clientId, tankId, payload, userContext) {
    logger.debug(`Submitting reading for client: ${clientId}, tank: ${tankId}`, payload);
    const tank = await tankRepository.getTankById(clientId, tankId);
    if (!tank) {
      throw { statusCode: 404, code: 'TANK_NOT_FOUND', message: `Tank '${tankId}' not found` };
    }

    const parameters = await tankRepository.getTankParameters(clientId, tankId);

    const alertsToCreate = [];
    const violationsToCreate = [];
    const inspectionValues = payload.inspectionValues || payload.inspection_values || {};

    // Evaluate constraints against inspection values
    for (const p of parameters) {
      const val = inspectionValues[p.id] !== undefined ? inspectionValues[p.id] : inspectionValues[p.label];
      if (val !== undefined && p.constraints && Array.isArray(p.constraints)) {
        for (const c of p.constraints) {
          const isTriggered = this.evaluateConstraint(c.op, val, c.compare_value_json);
          if (isTriggered) {
            const alertId = 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const alertMsg = c.message || c.alert_title || `Parameter '${p.label}' constraint violation (${p.label} ${c.op} ${c.compare_value_json})`;
            
            if (c.show_dashboard_alert || c.severity === 'warning' || c.severity === 'high') {
              alertsToCreate.push({
                id: alertId,
                constraint_id: c.id,
                param_id: p.id,
                tank_code: tank.tank_code,
                tank_name: tank.tank_name,
                message: alertMsg,
                severity: c.severity || 'warning',
                image_url: payload.image_url || null
              });
            }

            if (c.block_submission || c.severity === 'high' || c.severity === 'critical') {
              violationsToCreate.push({
                id: 'viol_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                constraint_id: c.id,
                param_id: p.id,
                tank_code: tank.tank_code,
                tank_name: tank.tank_name,
                message: alertMsg,
                severity: c.severity || 'high'
              });
            }
          }
        }
      }
    }

    const readingId = payload.id || 'rd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const readingData = {
      id: readingId,
      client_id: clientId,
      tank_id: tankId,
      captured_by: userContext ? userContext.userId : null,
      captured_by_name: userContext ? (userContext.username || userContext.name) : null,
      captured_at: payload.captured_at || payload.capturedAt || new Date(),
      final_level: payload.final_level !== undefined ? payload.final_level : payload.finalLevel,
      source: payload.source || 'app',
      image_url: payload.image_url || payload.imageUrl || null,
      inspection_values: inspectionValues,
      alertsToCreate,
      violationsToCreate
    };

    const result = await readingRepository.saveReadingTransaction(readingData);
    logger.info(`Reading saved successfully for tank '${tank.tank_name}' (${readingId})`);
    return {
      success: true,
      readingId,
      alertsCreated: alertsToCreate.length,
      violationsCreated: violationsToCreate.length
    };
  }

  evaluateConstraint(op, actual, compare) {
    if (actual === null || actual === undefined) return false;
    let actualNum = typeof actual === 'number' ? actual : parseFloat(actual);
    let compareNum = typeof compare === 'number' ? compare : parseFloat(compare);
    const useNum = !isNaN(actualNum) && !isNaN(compareNum);

    switch (op) {
      case '>':
        return useNum ? actualNum > compareNum : String(actual) > String(compare);
      case '>=':
        return useNum ? actualNum >= compareNum : String(actual) >= String(compare);
      case '<':
        return useNum ? actualNum < compareNum : String(actual) < String(compare);
      case '<=':
        return useNum ? actualNum <= compareNum : String(actual) <= String(compare);
      case '==':
      case '=':
        return useNum ? actualNum === compareNum : String(actual) === String(compare);
      case '!=':
        return useNum ? actualNum !== compareNum : String(actual) !== String(compare);
      default:
        return false;
    }
  }
}

module.exports = new ReadingService();

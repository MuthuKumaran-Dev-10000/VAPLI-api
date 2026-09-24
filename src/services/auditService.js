const auditRepository = require('../repositories/auditRepository');

class AuditService {
  async log(auditData) {
    await auditRepository.logTenantAction(auditData);
  }

  async getTenantLogs(clientId, limit) {
    return await auditRepository.getTenantLogs(clientId, limit);
  }

  async getMasterLogs(limit) {
    return await auditRepository.getMasterLogs(limit);
  }
}

module.exports = new AuditService();

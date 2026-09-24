const auditService = require('../services/auditService');

class AuditController {
  async getTenantLogs(req, res, next) {
    try {
      const logs = await auditService.getTenantLogs(req.params.clientId, req.query.limit);
      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }

  async getMasterLogs(req, res, next) {
    try {
      const logs = await auditService.getMasterLogs(req.query.limit);
      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }

  async createLog(req, res, next) {
    try {
      await auditService.log({
        client_id: req.params.clientId,
        ...req.body,
      });
      res.status(201).json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditController();

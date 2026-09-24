const db = require('../config/db');

class AuditRepository {
  async logTenantAction(auditData) {
    const id = auditData.id || 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await db.query(
      `INSERT INTO admin_audit_logs (id, client_id, actor_id, actor_name, actor_role, operation, outcome, summary, details_json, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        auditData.client_id || null,
        auditData.actor_id || null,
        auditData.actor_name || null,
        auditData.actor_role || null,
        auditData.operation || 'ACTION',
        auditData.outcome || 'SUCCESS',
        auditData.summary || null,
        JSON.stringify(auditData.details || {})
      ]
    );

    // Also write to master audit log table
    await db.query(
      `INSERT INTO admin_audit_logs_master (id, client_id, actor_id, actor_name, actor_role, operation, outcome, summary, details_json, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        auditData.client_id || null,
        auditData.actor_id || null,
        auditData.actor_name || null,
        auditData.actor_role || null,
        auditData.operation || 'ACTION',
        auditData.outcome || 'SUCCESS',
        auditData.summary || null,
        JSON.stringify(auditData.details || {})
      ]
    );
  }

  async getTenantLogs(clientId, limit = 100) {
    const [rows] = await db.query(
      `SELECT * FROM admin_audit_logs WHERE client_id = ? ORDER BY timestamp DESC LIMIT ?`,
      [clientId, parseInt(limit, 10)]
    );
    return rows;
  }

  async getMasterLogs(limit = 100) {
    const [rows] = await db.query(
      `SELECT * FROM admin_audit_logs_master ORDER BY timestamp DESC LIMIT ?`,
      [parseInt(limit, 10)]
    );
    return rows;
  }
}

module.exports = new AuditRepository();

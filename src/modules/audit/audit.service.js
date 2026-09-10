const db = require('../../config/database');

async function logAudit({
  actorId,
  actorUsername,
  actorRole,
  clientId = null,
  clientName = null,
  entityType,
  entityId = null,
  operation,
  outcome = 'success',
  beforeState = null,
  afterState = null,
  details = {}
}) {
  try {
    const timestamp = new Date().toISOString();
    const detailsJson = JSON.stringify(details || {});
    const beforeStateJson = beforeState ? JSON.stringify(beforeState) : null;
    const afterStateJson = afterState ? JSON.stringify(afterState) : null;

    await db.query(
      `INSERT INTO audit_logs (actor_id, actor_username, actor_role, client_id, client_name, entity_type, entity_id, operation, outcome, before_state, after_state, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [actorId, actorUsername, actorRole, clientId, clientName, entityType, entityId, operation, outcome, beforeStateJson, afterStateJson, detailsJson, timestamp]
    );
  } catch (err) {
    console.error('[AUDIT LOG ERROR] Failed to record audit log:', err.message);
  }
}

async function getAuditLogs(options = {}) {
  const { category, entityType, startDate, endDate, search, limit = 100 } = typeof options === 'object' ? options : { limit: options };

  const conditions = [];
  const params = [];

  const targetCategory = (category || entityType || '').trim().toLowerCase();
  if (targetCategory && targetCategory !== 'all') {
    conditions.push('LOWER(entity_type) = ?');
    params.push(targetCategory);
  }

  if (startDate) {
    conditions.push('timestamp >= ?');
    params.push(new Date(startDate).toISOString());
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push('timestamp <= ?');
    params.push(end.toISOString());
  }

  if (search && search.trim().length > 0) {
    conditions.push('(LOWER(actor_username) LIKE ? OR LOWER(operation) LIKE ? OR LOWER(entity_id) LIKE ?)');
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term, term);
  }

  let sql = 'SELECT * FROM audit_logs';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  const rows = await db.query(sql, params);
  return rows.map(r => ({
    ...r,
    before_state: typeof r.before_state === 'string' ? JSON.parse(r.before_state) : r.before_state,
    after_state: typeof r.after_state === 'string' ? JSON.parse(r.after_state) : r.after_state,
    details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details
  }));
}

async function logAction({ req, entityType, entityId, operation, outcome = 'success', beforeState = null, afterState = null, details = {} }) {
  try {
    const actorId = req?.user?.id || 'system';
    const actorUsername = req?.user?.username || 'system';
    const actorRole = req?.user?.role || 'user';
    const clientId = req?.user?.clientIds?.[0] || null;

    await logAudit({
      actorId,
      actorUsername,
      actorRole,
      clientId,
      entityType,
      entityId,
      operation,
      outcome,
      beforeState,
      afterState,
      details
    });
  } catch (err) {
    console.error('[AUDIT LOG ACTION ERROR]', err.message);
  }
}

module.exports = {
  logAudit,
  logAction,
  getAuditLogs
};

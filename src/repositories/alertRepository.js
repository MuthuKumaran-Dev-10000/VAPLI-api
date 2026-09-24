const db = require('../config/db');

class AlertRepository {
  async getAlerts(clientId, options = {}) {
    let sql = `SELECT * FROM alerts WHERE client_id = ?`;
    const params = [clientId];
    if (options.status) {
      sql += ` AND status = ?`;
      params.push(options.status);
    }
    if (options.tankId) {
      sql += ` AND tank_id = ?`;
      params.push(options.tankId);
    }
    sql += ` ORDER BY timestamp DESC`;
    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(parseInt(options.limit, 10));
    }
    const [rows] = await db.query(sql, params);
    return rows;
  }

  async getViolations(clientId, options = {}) {
    let sql = `SELECT * FROM violations WHERE client_id = ?`;
    const params = [clientId];
    if (options.status) {
      sql += ` AND status = ?`;
      params.push(options.status);
    }
    sql += ` ORDER BY timestamp DESC`;
    const [rows] = await db.query(sql, params);
    return rows;
  }

  async updateAlertStatus(clientId, alertId, updateData) {
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(updateData)) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
    if (fields.length === 0) return;
    values.push(clientId, alertId);
    await db.query(`UPDATE alerts SET ${fields.join(', ')} WHERE client_id = ? AND id = ?`, values);
  }

  async createCompletedTask(taskData) {
    await db.query(
      `INSERT INTO completed_tasks (id, client_id, alert_id, completed_at, completed_by, completed_by_name, description, photo_urls_json)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [
        taskData.id,
        taskData.client_id,
        taskData.alert_id || null,
        taskData.completed_by || null,
        taskData.completed_by_name || null,
        taskData.description || null,
        JSON.stringify(taskData.photo_urls || [])
      ]
    );
  }

  async getCompletedTasks(clientId) {
    const [rows] = await db.query(
      `SELECT * FROM completed_tasks WHERE client_id = ? ORDER BY completed_at DESC`,
      [clientId]
    );
    return rows;
  }
}

module.exports = new AlertRepository();

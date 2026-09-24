const db = require('../config/db');

class AlertRepository {
  async getAlerts(clientId, options = {}) {
    let sql = `
      SELECT a.*,
             MAX(pc.op) AS c_op,
             MAX(pc.compare_value_json) AS c_compare_value,
             MAX(pc.message) AS c_message
      FROM alerts a
      LEFT JOIN parameter_constraints pc
        ON (a.constraint_id = pc.id OR a.constraint_id = pc.legacy_firebase_key OR a.constraint_id LIKE CONCAT('%:', pc.legacy_firebase_key))
        AND (a.client_id = pc.client_id OR pc.client_id IS NULL)
      WHERE a.client_id = ?
    `;
    const params = [clientId];
    if (options.status) {
      sql += ` AND a.status = ?`;
      params.push(options.status);
    }
    if (options.tankId) {
      sql += ` AND a.tank_id = ?`;
      params.push(options.tankId);
    }
    sql += ` GROUP BY a.id ORDER BY a.timestamp DESC`;
    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(parseInt(options.limit, 10));
    }
    const [rows] = await db.query(sql, params);

    return rows.map(r => {
      let extra = {};
      if (r.extra_json) {
        try {
          extra = typeof r.extra_json === 'string' ? JSON.parse(r.extra_json) : r.extra_json;
        } catch (_) {}
      }

      let parsedVal = r.value_json;
      if (typeof parsedVal === 'string') {
        try { parsedVal = JSON.parse(parsedVal); } catch (_) {}
      }

      let thresholdVal = r.c_compare_value;
      if (typeof thresholdVal === 'string') {
        try { thresholdVal = JSON.parse(thresholdVal); } catch (_) {}
      }
      const constraintVal = (thresholdVal != null && thresholdVal !== '') 
        ? String(thresholdVal) 
        : (extra.constraint_value || extra.compare_value || extra.threshold_value || extra.param_value || '');

      const paramVal = (parsedVal != null && parsedVal !== '') 
        ? String(parsedVal) 
        : (extra.param_value || extra.violated_value || constraintVal);

      let op = r.c_op || extra.constraint_op || extra.op || r.op || '';
      if (!op || op === 'null') op = '==';

      const paramLabel = r.label || extra.param_label || extra.constraint_label || extra.param_name || '';
      const msg = r.message || r.c_message || extra.message || '';

      return {
        ...r,
        alert_title: extra.alert_title || r.label || 'Alert',
        param_label: paramLabel,
        label: paramLabel,
        param_value: paramVal,
        violated_value: paramVal,
        constraint_value: constraintVal,
        compare_value: constraintVal,
        op: op,
        constraint_op: op,
        message: msg,
        param_id: r.param_id || extra.param_id || extra.legacy_param_id || '',
        captured_by: r.resolved_by || extra.captured_by || '',
        captured_by_name: extra.captured_by_name || 'System Administrator',
        image_url: r.capture_image_url || extra.image_url || '',
        completed_photo_urls: extra.completed_photo_urls || (r.completed_photo_url ? [r.completed_photo_url] : []),
        live: r.live === 1,
        acknowledged: r.acknowledged === 1,
        if_then: r.if_then === 1,
      };
    });
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
    const validColumns = [
      'status', 'acknowledged', 'live', 'completed_description', 'completed_photo_url',
      'resolved_at', 'resolved_by', 'resolved_description', 'extra_json', 'severity'
    ];
    const fields = [];
    const values = [];

    const data = { ...updateData };
    if (data.completed_photo_urls && Array.isArray(data.completed_photo_urls)) {
      if (!data.completed_photo_url && data.completed_photo_urls.length > 0) {
        data.completed_photo_url = data.completed_photo_urls[0];
      }
      let extra = {};
      if (data.extra_json) {
        try { extra = typeof data.extra_json === 'string' ? JSON.parse(data.extra_json) : data.extra_json; } catch(_) {}
      }
      extra.completed_photo_urls = data.completed_photo_urls;
      data.extra_json = JSON.stringify(extra);
      delete data.completed_photo_urls;
    }

    if (data.status && data.status.toUpperCase() === 'COMPLETED') {
      data.live = 0;
      if (!data.resolved_at) data.resolved_at = new Date();
    }

    for (const [k, v] of Object.entries(data)) {
      if (validColumns.includes(k)) {
        fields.push(`${k} = ?`);
        values.push(v);
      }
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

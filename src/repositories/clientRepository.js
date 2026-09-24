const db = require('../config/db');

class ClientRepository {
  async findAll() {
    const [rows] = await db.query(`SELECT * FROM clients WHERE is_active = 1 ORDER BY name ASC`);
    return rows;
  }

  async findById(id) {
    const [rows] = await db.query(`SELECT * FROM clients WHERE id = ? OR db_key = ? LIMIT 1`, [id, id]);
    return rows[0] || null;
  }

  async getMeta(clientId) {
    const [rows] = await db.query(`SELECT meta_key, meta_value_json FROM client_meta WHERE client_id = ?`, [clientId]);
    const result = {};
    for (const r of rows) {
      result[r.meta_key] = r.meta_value_json;
    }
    return result;
  }

  async getSettings(clientId) {
    const [rows] = await db.query(`SELECT key_name, json_value, bool_value, string_value FROM client_settings WHERE client_id = ?`, [clientId]);
    const result = {};
    for (const r of rows) {
      result[r.key_name] = r.json_value !== null ? r.json_value : (r.bool_value !== null ? !!r.bool_value : r.string_value);
    }
    return result;
  }

  async getSystemSettings(clientId) {
    const [rows] = await db.query(`SELECT key_name, json_value, bool_value, string_value FROM system_settings WHERE client_id = ?`, [clientId]);
    const result = {};
    for (const r of rows) {
      result[r.key_name] = r.json_value !== null ? r.json_value : (r.bool_value !== null ? !!r.bool_value : r.string_value);
    }
    return result;
  }

  async create(client) {
    await db.query(
      `INSERT INTO clients (id, db_key, name, description, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [client.id, client.db_key, client.name, client.description || null, client.is_active !== false ? 1 : 0]
    );
  }

  async update(id, updates) {
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(updates)) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
    if (fields.length === 0) return;
    values.push(id);
    await db.query(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async delete(id) {
    await db.query(`DELETE FROM clients WHERE id = ? OR db_key = ?`, [id, id]);
  }

  async setSetting(clientId, keyName, value) {
    const jsonVal = typeof value === 'object' ? JSON.stringify(value) : null;
    const boolVal = typeof value === 'boolean' ? (value ? 1 : 0) : null;
    const strVal = typeof value === 'string' ? value : null;
    await db.query(
      `INSERT INTO client_settings (client_id, key_name, json_value, bool_value, string_value, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE json_value=VALUES(json_value), bool_value=VALUES(bool_value), string_value=VALUES(string_value), updated_at=NOW()`,
      [clientId, keyName, jsonVal, boolVal, strVal]
    );
  }
}

module.exports = new ClientRepository();

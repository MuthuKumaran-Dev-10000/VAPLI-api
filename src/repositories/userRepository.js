const db = require('../config/db');

class UserRepository {
  async findByUsername(username) {
    const [rows] = await db.query(
      `SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [username, username]
    );
    return rows[0] || null;
  }

  async findById(id) {
    const [rows] = await db.query(
      `SELECT * FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async findAll() {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.display_name, u.email, u.phone, u.role, u.client_id, u.is_active, u.created_at, u.last_login_at, u.privileges_json,
              GROUP_CONCAT(uc.client_id) AS client_ids_str
       FROM users u
       LEFT JOIN user_clients uc ON u.id = uc.user_id AND uc.is_active = 1
       GROUP BY u.id
       ORDER BY u.username ASC`
    );
    return rows.map(r => {
      const { client_ids_str, ...user } = r;
      const ids = new Set();
      if (user.client_id) ids.add(user.client_id);
      if (client_ids_str) {
        client_ids_str.split(',').forEach(id => {
          if (id && id.trim()) ids.add(id.trim());
        });
      }
      user.client_ids = Array.from(ids);
      if (typeof user.privileges_json === 'string') {
        try {
          user.privileges = JSON.parse(user.privileges_json);
        } catch (e) {
          user.privileges = {};
        }
      } else if (user.privileges_json && typeof user.privileges_json === 'object') {
        user.privileges = user.privileges_json;
      } else {
        user.privileges = {};
      }
      return user;
    });
  }

  async getUserClients(userId) {
    const [rows] = await db.query(
      `SELECT DISTINCT c.* FROM clients c
       LEFT JOIN user_clients uc ON c.id = uc.client_id AND uc.user_id = ? AND uc.is_active = 1
       LEFT JOIN users u ON u.id = ? AND u.client_id = c.id
       WHERE (uc.user_id IS NOT NULL OR u.client_id IS NOT NULL) AND c.is_active = 1`,
      [userId, userId]
    );
    return rows;
  }

  async recordLoginSuccess(userId) {
    await db.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?`,
      [userId]
    );
  }

  async recordLoginFailure(userId, maxAttempts = 5, lockoutMinutes = 15) {
    const [rows] = await db.query(`SELECT failed_login_attempts FROM users WHERE id = ?`, [userId]);
    if (!rows[0]) return;
    const attempts = (rows[0].failed_login_attempts || 0) + 1;
    let lockedUntil = null;
    if (attempts >= maxAttempts) {
      lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    }
    await db.query(
      `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`,
      [attempts, lockedUntil, userId]
    );
  }

  async create(user) {
    let clientIds = [];
    if (Array.isArray(user.client_ids)) {
      clientIds = user.client_ids.map(c => c.toString().trim()).filter(Boolean);
    } else if (user.client_id) {
      clientIds = [user.client_id.toString().trim()];
    }
    const primaryClientId = clientIds.length > 0 ? clientIds[0] : (user.client_id || null);

    let privObj = user.privileges || user.privileges_json;
    if (typeof privObj === 'string') {
      try { privObj = JSON.parse(privObj); } catch (e) { privObj = null; }
    }
    if (!privObj || typeof privObj !== 'object') {
      const r = (user.role || 'user').toLowerCase().trim();
      if (r === 'super admin') {
        privObj = {
          open_admin_page: true, view_admin_tanks: true, view_admin_clients: true, view_admin_users: true,
          view_settings: true, view_audit_logs: true, create_client: true, create_users: true, grant_users: true,
          create_tanks: true, delete_tanks: true, modify_tanks: true, allocate_users_to_clients: true,
          change_settings: true, historical_upload: true
        };
      } else if (r === 'admin') {
        privObj = {
          open_admin_page: true, view_admin_tanks: true, view_admin_users: true, view_settings: true,
          create_users: true, grant_users: true, create_tanks: true, delete_tanks: true, modify_tanks: true,
          allocate_users_to_clients: true, change_settings: true, view_admin_clients: false, view_audit_logs: false, historical_upload: false
        };
      } else {
        privObj = {
          open_admin_page: false, view_admin_tanks: false, view_admin_users: false, view_settings: false,
          create_users: false, grant_users: false, create_tanks: false, delete_tanks: false, modify_tanks: false,
          allocate_users_to_clients: false, change_settings: false, view_admin_clients: false, view_audit_logs: false, historical_upload: false
        };
      }
    }
    const privilegesJson = JSON.stringify(privObj);

    const [result] = await db.query(
      `INSERT INTO users (id, username, password_hash, display_name, email, phone, role, client_id, is_active, privileges_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        user.id,
        user.username,
        user.password_hash,
        user.display_name || user.username,
        user.email || null,
        user.phone || null,
        user.role || 'user',
        primaryClientId,
        user.is_active !== false ? 1 : 0,
        privilegesJson
      ]
    );
    for (const cid of clientIds) {
      await db.query(
        `INSERT INTO user_clients (user_id, client_id, is_active) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE is_active=1`,
        [user.id, cid]
      );
    }
    return result;
  }

  async update(id, updates) {
    const { client_ids, privileges, privileges_json, ...dbUpdates } = updates;
    let clientIds = null;
    if (Array.isArray(client_ids)) {
      clientIds = client_ids.map(c => c.toString().trim()).filter(Boolean);
    } else if (updates.client_id) {
      clientIds = [updates.client_id.toString().trim()];
    }

    if (clientIds !== null) {
      await db.query(`DELETE FROM user_clients WHERE user_id = ?`, [id]);
      for (const cid of clientIds) {
        await db.query(
          `INSERT INTO user_clients (user_id, client_id, is_active) VALUES (?, ?, 1)`,
          [id, cid]
        );
      }
      dbUpdates.client_id = clientIds.length > 0 ? clientIds[0] : null;
    }

    let privObj = privileges || privileges_json;
    if (privObj !== undefined) {
      if (typeof privObj === 'string') {
        dbUpdates.privileges_json = privObj;
      } else if (typeof privObj === 'object' && privObj !== null) {
        dbUpdates.privileges_json = JSON.stringify(privObj);
      }
    }

    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(dbUpdates)) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
    if (fields.length > 0) {
      values.push(id);
      await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async delete(id) {
    await db.query(`DELETE FROM user_clients WHERE user_id = ?`, [id]);
    await db.query(`DELETE FROM users WHERE id = ?`, [id]);
  }
}

module.exports = new UserRepository();

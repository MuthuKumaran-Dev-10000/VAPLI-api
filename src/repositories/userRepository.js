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
      `SELECT u.id, u.username, u.display_name, u.email, u.phone, u.role, u.client_id, u.is_active, u.created_at, u.last_login_at,
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
    const [result] = await db.query(
      `INSERT INTO users (id, username, password_hash, display_name, email, phone, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        user.id,
        user.username,
        user.password_hash,
        user.display_name || user.username,
        user.email || null,
        user.phone || null,
        user.role || 'user',
        user.is_active !== false ? 1 : 0
      ]
    );
    if (Array.isArray(user.client_ids)) {
      for (const cid of user.client_ids) {
        if (cid && cid.toString().trim()) {
          await db.query(
            `INSERT INTO user_clients (user_id, client_id, is_active) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE is_active=1`,
            [user.id, cid.toString().trim()]
          );
        }
      }
    }
    return result;
  }

  async update(id, updates) {
    const { client_ids, ...dbUpdates } = updates;
    if (Array.isArray(client_ids)) {
      await db.query(`DELETE FROM user_clients WHERE user_id = ?`, [id]);
      for (const cid of client_ids) {
        if (cid && cid.toString().trim()) {
          await db.query(
            `INSERT INTO user_clients (user_id, client_id, is_active) VALUES (?, ?, 1)`,
            [id, cid.toString().trim()]
          );
        }
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

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
      `SELECT id, username, display_name, email, phone, role, is_active, created_at, last_login_at FROM users ORDER BY username ASC`
    );
    return rows;
  }

  async getUserClients(userId) {
    const [rows] = await db.query(
      `SELECT c.* FROM clients c
       JOIN user_clients uc ON c.id = uc.client_id
       WHERE uc.user_id = ? AND uc.is_active = 1 AND c.is_active = 1`,
      [userId]
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
    return result;
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
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async delete(id) {
    await db.query(`DELETE FROM user_clients WHERE user_id = ?`, [id]);
    await db.query(`DELETE FROM users WHERE id = ?`, [id]);
  }
}

module.exports = new UserRepository();

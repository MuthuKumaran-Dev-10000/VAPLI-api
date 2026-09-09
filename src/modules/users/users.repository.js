const db = require('../../config/database');

async function getAllUsers() {
  const sql = `
    SELECT u.id, u.username, u.full_name, u.role_id, r.name as role, r.\`rank\` as role_rank,
           u.phone, u.email, u.address, u.failed_login_attempts, u.locked_until, u.is_active,
           u.last_login_at, u.created_at
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at DESC
  `;
  const users = await db.query(sql);

  const ucaSql = `SELECT user_id, client_id FROM user_client_access`;
  const accessRows = await db.query(ucaSql);

  const clientMap = {};
  accessRows.forEach(r => {
    if (!clientMap[r.user_id]) clientMap[r.user_id] = [];
    clientMap[r.user_id].push(r.client_id);
  });

  return users.map(u => ({
    ...u,
    role: (u.role || 'user').trim().toLowerCase(),
    client_ids: clientMap[u.id] || []
  }));
}

async function getUserById(id) {
  const sql = `
    SELECT u.id, u.username, u.full_name, u.role_id, r.name as role, r.\`rank\` as role_rank,
           u.phone, u.email, u.address, u.failed_login_attempts, u.locked_until, u.is_active,
           u.last_login_at, u.created_at
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = ? LIMIT 1
  `;
  const rows = await db.query(sql, [id]);
  if (!rows[0]) return null;

  const user = rows[0];
  const ucaSql = `SELECT client_id FROM user_client_access WHERE user_id = ?`;
  const accessRows = await db.query(ucaSql, [id]);

  return {
    ...user,
    role: (user.role || 'user').trim().toLowerCase(),
    client_ids: accessRows.map(r => r.client_id)
  };
}

async function findUserByUsername(username) {
  const sql = `SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1`;
  const rows = await db.query(sql, [username.trim()]);
  return rows[0] || null;
}

async function getRoleIdByName(roleName) {
  const normalized = (roleName || 'user').trim().toLowerCase();
  const sql = `SELECT id, name, \`rank\` FROM roles WHERE LOWER(name) = LOWER(?) LIMIT 1`;
  const rows = await db.query(sql, [normalized]);
  if (rows[0]) return rows[0];

  return { id: 3, name: 'user', rank: 3 };
}

async function createUser(userData, clientIds = []) {
  const { id, username, fullName, passwordHash, roleId, phone, email, address, createdAt, updatedAt } = userData;
  const sql = `
    INSERT INTO users (id, username, full_name, password_hash, role_id, phone, email, address, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `;
  await db.query(sql, [id, username, fullName, passwordHash, roleId, phone || null, email || null, address || null, createdAt, updatedAt]);

  for (const clientId of clientIds) {
    await db.query(`INSERT INTO user_client_access (user_id, client_id, granted_at) VALUES (?, ?, ?)`, [id, clientId, createdAt]);
  }

  return getUserById(id);
}

async function updateUser(id, updates, clientIds = null) {
  const fields = [];
  const params = [];

  if (updates.fullName !== undefined) {
    fields.push('full_name = ?');
    params.push(updates.fullName);
  }
  if (updates.passwordHash !== undefined) {
    fields.push('password_hash = ?');
    params.push(updates.passwordHash);
  }
  if (updates.roleId !== undefined) {
    fields.push('role_id = ?');
    params.push(updates.roleId);
  }
  if (updates.phone !== undefined || updates.mobile !== undefined) {
    fields.push('phone = ?');
    params.push(updates.phone || updates.mobile);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    params.push(updates.email);
  }
  if (updates.address !== undefined) {
    fields.push('address = ?');
    params.push(updates.address);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    params.push(updates.isActive ? 1 : 0);
  }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, params);
  }

  if (clientIds && Array.isArray(clientIds)) {
    const now = new Date().toISOString();
    await db.query(`DELETE FROM user_client_access WHERE user_id = ?`, [id]);
    for (const cid of clientIds) {
      await db.query(`INSERT INTO user_client_access (user_id, client_id, granted_at) VALUES (?, ?, ?)`, [id, cid, now]);
    }
  }

  return getUserById(id);
}

async function deleteUser(id) {
  await db.query(`DELETE FROM user_client_access WHERE user_id = ?`, [id]);
  await db.query(`DELETE FROM user_permissions WHERE user_id = ?`, [id]);
  await db.query(`DELETE FROM users WHERE id = ?`, [id]);
}

module.exports = {
  getAllUsers,
  getUserById,
  findUserByUsername,
  getRoleIdByName,
  createUser,
  updateUser,
  deleteUser
};

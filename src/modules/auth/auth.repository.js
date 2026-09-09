const db = require('../../config/database');

async function findUserByUsername(username) {
  const sql = `
    SELECT u.*, r.name as role_name, r.\`rank\` as role_rank
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE LOWER(u.username) = LOWER(?) AND u.is_active = 1
    LIMIT 1
  `;
  const rows = await db.query(sql, [username.trim()]);
  return rows[0] || null;
}

async function getUserClientIds(userId) {
  const sql = `SELECT client_id FROM user_client_access WHERE user_id = ?`;
  const rows = await db.query(sql, [userId]);
  return rows.map(r => r.client_id);
}

async function getUserPrivileges(userId, roleName) {
  const defaultPrivs = getDefaultPrivilegesForRole(roleName);

  const sql = `
    SELECT p.code, up.granted
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = ?
  `;
  const rows = await db.query(sql, [userId]);

  const privileges = { ...defaultPrivs };
  rows.forEach(r => {
    privileges[r.code] = r.granted === 1 || r.granted === true;
  });

  return privileges;
}

function getDefaultPrivilegesForRole(roleName) {
  const r = (roleName || '').trim().toLowerCase();
  if (r === 'super admin') {
    return {
      open_admin_page: true,
      view_admin_tanks: true,
      view_admin_clients: true,
      view_admin_users: true,
      view_settings: true,
      view_audit_logs: true,
      create_client: true,
      create_users: true,
      grant_users: true,
      create_tanks: true,
      delete_tanks: true,
      modify_tanks: true,
      allocate_users_to_clients: true,
      change_settings: true,
      historical_upload: true
    };
  }
  if (r === 'admin') {
    return {
      open_admin_page: true,
      view_admin_tanks: true,
      view_admin_clients: false,
      view_admin_users: true,
      view_settings: true,
      view_audit_logs: true,
      create_client: false,
      create_users: true,
      grant_users: true,
      create_tanks: true,
      delete_tanks: true,
      modify_tanks: true,
      allocate_users_to_clients: true,
      change_settings: true,
      historical_upload: true
    };
  }
  return {
    open_admin_page: false,
    view_admin_tanks: false,
    view_admin_clients: false,
    view_admin_users: false,
    view_settings: false,
    view_audit_logs: false,
    create_client: false,
    create_users: false,
    grant_users: false,
    create_tanks: false,
    delete_tanks: false,
    modify_tanks: false,
    allocate_users_to_clients: false,
    change_settings: false,
    historical_upload: false
  };
}

async function updateLastLogin(userId) {
  const now = new Date().toISOString();
  await db.query('UPDATE users SET last_login_at = ? WHERE id = ?', [now, userId]);
}

module.exports = {
  findUserByUsername,
  getUserClientIds,
  getUserPrivileges,
  updateLastLogin
};

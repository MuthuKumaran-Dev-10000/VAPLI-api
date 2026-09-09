const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let pool = null;

function getPoolConfig() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'vapli_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

const inMemoryStore = {
  isFallback: false,
  roles: [
    { id: 1, name: 'super admin', rank: 1, description: 'Super Administrator' },
    { id: 2, name: 'admin', rank: 2, description: 'Client Administrator' },
    { id: 3, name: 'user', rank: 3, description: 'Standard User' }
  ],
  permissions: [
    { id: 1, code: 'open_admin_page', name: 'Open Admin Page', category: 'view' },
    { id: 2, code: 'view_admin_tanks', name: 'View Admin Tanks', category: 'view' },
    { id: 3, code: 'view_admin_clients', name: 'View Admin Clients', category: 'view' },
    { id: 4, code: 'view_admin_users', name: 'View Admin Users', category: 'view' },
    { id: 5, code: 'view_settings', name: 'View Settings', category: 'view' },
    { id: 6, code: 'view_audit_logs', name: 'View Audit Logs', category: 'view' },
    { id: 7, code: 'create_client', name: 'Create Client', category: 'action' },
    { id: 8, code: 'create_users', name: 'Create Users', category: 'action' },
    { id: 9, code: 'grant_users', name: 'Grant Users', category: 'action' },
    { id: 10, code: 'create_tanks', name: 'Create Tanks', category: 'action' },
    { id: 11, code: 'delete_tanks', name: 'Delete Tanks', category: 'action' },
    { id: 12, code: 'modify_tanks', name: 'Modify Tanks', category: 'action' },
    { id: 13, code: 'allocate_users_to_clients', name: 'Allocate Users to Clients', category: 'action' },
    { id: 14, code: 'change_settings', name: 'Change Settings', category: 'action' },
    { id: 15, code: 'historical_upload', name: 'Historical Upload', category: 'action' }
  ],
  role_permissions: [],
  clients: [],
  users: [],
  user_client_access: [],
  user_permissions: [],
  audit_logs: []
};

async function initPool() {
  if (pool) return pool;

  try {
    const config = getPoolConfig();
    const tempPool = mysql.createPool(config);
    const conn = await tempPool.getConnection();
    conn.release();
    pool = tempPool;
    console.log(`[DB] Connected successfully to MySQL database '${config.database}' at ${config.host}:${config.port}`);
    await autoMigrate(tempPool);
    return pool;
  } catch (err) {
    console.warn(`[DB] Warning: MySQL connection failed (${err.message}). Using resilient in-memory database store for development tests.`);
    inMemoryStore.isFallback = true;
    seedInMemoryData();
    return null;
  }
}

async function autoMigrate(tempPool) {
  try {
    const sqlFile = path.join(__dirname, '../../migrations/001_initial_schema.sql');
    if (!fs.existsSync(sqlFile)) return;
    const sql = fs.readFileSync(sqlFile, 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      try {
        await tempPool.query(stmt);
      } catch (e) {
        // Ignore duplicate key or existing table errors during autoMigrate
      }
    }
    try {
      await tempPool.query('ALTER TABLE users ADD COLUMN address TEXT');
    } catch (_) {}
    try {
      await tempPool.query('ALTER TABLE audit_logs ADD COLUMN before_state JSON');
    } catch (_) {}
    try {
      await tempPool.query('ALTER TABLE audit_logs ADD COLUMN after_state JSON');
    } catch (_) {}
  } catch (_) {}
}

function seedInMemoryData() {
  if (inMemoryStore.clients.length > 0) return;

  const backupPath = path.join(__dirname, '../../../vapli_original_git/Backup-26-06-2026.json');
  if (fs.existsSync(backupPath)) {
    try {
      const raw = fs.readFileSync(backupPath, 'utf8');
      const data = JSON.parse(raw);

      if (data.clients) {
        Object.values(data.clients).forEach(c => {
          inMemoryStore.clients.push({
            id: c.id,
            name: c.name,
            db_key: c.db_key,
            description: c.description || '',
            root_folder_id: c.root_folder_id || null,
            is_active: c.is_active !== false ? 1 : 0,
            created_at: c.created_at || new Date().toISOString(),
            updated_at: c.created_at || new Date().toISOString(),
          });
        });
      }

      if (data.users) {
        Object.values(data.users).forEach(u => {
          const roleName = (u.role || 'user').trim().toLowerCase();
          const role = inMemoryStore.roles.find(r => r.name === roleName) || inMemoryStore.roles[2];
          inMemoryStore.users.push({
            id: u.id,
            username: (u.username || '').trim(),
            full_name: u.full_name || u.username,
            password_hash: u.password_hash || '',
            role_id: role.id,
            role_name: role.name,
            role_rank: role.rank,
            phone: u.phone || null,
            email: u.email || null,
            failed_login_attempts: u.failed_login_attempts || 0,
            locked_until: u.locked_until || null,
            is_active: u.is_active !== false ? 1 : 0,
            last_login_at: u.last_login_at || null,
            created_at: u.created_at || new Date().toISOString(),
            updated_at: u.created_at || new Date().toISOString(),
          });

          const clientIds = u.client_ids || u.clientIds || [];
          clientIds.forEach(cid => {
            if (cid) {
              inMemoryStore.user_client_access.push({
                user_id: u.id,
                client_id: cid,
                granted_at: u.created_at || new Date().toISOString(),
              });
            }
          });
        });
      }
    } catch (_) {}
  }

  if (!inMemoryStore.clients.some(c => c.id === 'test_client' || c.db_key === 'test_client')) {
    inMemoryStore.clients.unshift({
      id: 'test_client',
      name: 'Test Client',
      db_key: 'test_client',
      description: 'Default System Test Client Organization',
      root_folder_id: null,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (!inMemoryStore.users.some(u => u.username.toLowerCase() === 'admin')) {
    inMemoryStore.users.unshift({
      id: 'root-admin',
      username: 'admin',
      full_name: 'System Administrator',
      password_hash: '7d20f317b9e34c36747cf8275645ab8fe145e29b70f3722a6fcd7d0cff2cd0c8',
      role_id: 1,
      role_name: 'super admin',
      role_rank: 1,
      phone: null,
      email: 'admin@vapli.com',
      failed_login_attempts: 0,
      locked_until: null,
      is_active: 1,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    inMemoryStore.user_client_access.push({
      user_id: 'root-admin',
      client_id: 'test_client',
      granted_at: new Date().toISOString()
    });
  }
}

async function query(sql, params = []) {
  if (!pool && !inMemoryStore.isFallback) {
    await initPool();
  }

  if (pool) {
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  return executeInMemoryQuery(sql, params);
}

function executeInMemoryQuery(sql, params) {
  const normalized = sql.trim().toLowerCase();

  if (normalized.startsWith('select')) {
    if (normalized.includes('from users') && (normalized.includes('where lower(u.username)') || normalized.includes('where lower(username)'))) {
      const username = (params[0] || '').trim().toLowerCase();
      const u = inMemoryStore.users.find(user => user.username.trim().toLowerCase() === username && user.is_active);
      return u ? [{ ...u }] : [];
    }

    if (normalized.includes('from users') && (normalized.includes('u.id = ?') || normalized.includes('where id = ?'))) {
      const u = inMemoryStore.users.find(user => user.id === params[0]);
      return u ? [{ ...u }] : [];
    }

    if (normalized.includes('from users')) {
      return inMemoryStore.users.filter(u => u.is_active);
    }

    if (normalized.includes('from clients') && normalized.includes('where db_key = ?')) {
      const dbKey = (params[0] || '').trim().toLowerCase();
      const c = inMemoryStore.clients.find(client => client.db_key.toLowerCase() === dbKey);
      return c ? [{ ...c }] : [];
    }

    if (normalized.includes('from clients') && (normalized.includes('where id = ?') || normalized.includes('id = ?'))) {
      const c = inMemoryStore.clients.find(client => client.id === params[0]);
      return c ? [{ ...c }] : [];
    }

    if (normalized.includes('from clients')) {
      return inMemoryStore.clients.filter(c => c.is_active);
    }

    if (normalized.includes('from roles') && normalized.includes('where lower(name)')) {
      const roleName = (params[0] || '').trim().toLowerCase();
      const r = inMemoryStore.roles.find(role => role.name.toLowerCase() === roleName);
      return r ? [{ ...r }] : [];
    }

    if (normalized.includes('from roles')) {
      return inMemoryStore.roles;
    }

    if (normalized.includes('from user_client_access')) {
      if (params.length > 0) {
        return inMemoryStore.user_client_access.filter(uca => uca.user_id === params[0]);
      }
      return inMemoryStore.user_client_access;
    }

    if (normalized.includes('from audit_logs')) {
      return inMemoryStore.audit_logs;
    }
  }

  if (normalized.startsWith('insert into clients')) {
    const [id, name, db_key, description, root_folder_id, is_active, created_at, updated_at] = params;
    const client = { id, name, db_key, description: description || '', root_folder_id: root_folder_id || null, is_active: is_active ? 1 : 0, created_at, updated_at };
    inMemoryStore.clients.push(client);
    return { affectedRows: 1, insertId: id };
  }

  if (normalized.startsWith('insert into users')) {
    const [id, username, full_name, password_hash, role_id, phone, email, is_active, created_at, updated_at] = params;
    const role = inMemoryStore.roles.find(r => r.id === role_id) || inMemoryStore.roles[2];
    const user = { id, username: username.trim(), full_name, password_hash, role_id, role_name: role.name, role_rank: role.rank, phone: phone || null, email: email || null, is_active: is_active ? 1 : 0, created_at, updated_at };
    inMemoryStore.users.push(user);
    return { affectedRows: 1, insertId: id };
  }

  if (normalized.startsWith('insert into user_client_access')) {
    const [user_id, client_id, granted_at] = params;
    inMemoryStore.user_client_access.push({ user_id, client_id, granted_at });
    return { affectedRows: 1 };
  }

  if (normalized.startsWith('insert into audit_logs')) {
    const [actor_id, actor_username, actor_role, client_id, client_name, entity_type, entity_id, operation, outcome, before_state, after_state, details, timestamp] = params;
    const log = {
      id: inMemoryStore.audit_logs.length + 1,
      actor_id,
      actor_username,
      actor_role,
      client_id,
      client_name,
      entity_type,
      entity_id,
      operation,
      outcome,
      before_state: typeof before_state === 'string' ? JSON.parse(before_state) : before_state,
      after_state: typeof after_state === 'string' ? JSON.parse(after_state) : after_state,
      details: typeof details === 'string' ? JSON.parse(details) : details,
      timestamp
    };
    inMemoryStore.audit_logs.push(log);
    return { affectedRows: 1, insertId: log.id };
  }

  if (normalized.startsWith('update clients')) {
    const id = params[params.length - 1];
    const client = inMemoryStore.clients.find(c => c.id === id);
    if (client) {
      if (params.length >= 3 && typeof params[0] === 'string') client.name = params[0];
      if (params.length >= 3 && typeof params[1] === 'string') client.description = params[1];
    }
    return { affectedRows: client ? 1 : 0 };
  }

  if (normalized.startsWith('update users')) {
    const id = params[params.length - 1];
    const user = inMemoryStore.users.find(u => u.id === id);
    if (user) {
      if (params[0]) user.full_name = params[0];
    }
    return { affectedRows: user ? 1 : 0 };
  }

  if (normalized.startsWith('delete from clients')) {
    const id = params[0];
    const idx = inMemoryStore.clients.findIndex(c => c.id === id);
    if (idx !== -1) inMemoryStore.clients.splice(idx, 1);
    return { affectedRows: idx !== -1 ? 1 : 0 };
  }

  if (normalized.startsWith('delete from users')) {
    const id = params[0];
    const idx = inMemoryStore.users.findIndex(u => u.id === id);
    if (idx !== -1) inMemoryStore.users.splice(idx, 1);
    return { affectedRows: idx !== -1 ? 1 : 0 };
  }

  return [];
}

module.exports = {
  initPool,
  query,
  getInMemoryStore: () => inMemoryStore
};

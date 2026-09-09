-- VAPLI MySQL Relational Schema Initial Migration

CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  `rank` INT NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  db_key VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  root_folder_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  failed_login_attempts INT DEFAULT 0,
  locked_until VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at VARCHAR(64),
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS user_client_access (
  user_id VARCHAR(64) NOT NULL,
  client_id VARCHAR(64) NOT NULL,
  granted_at VARCHAR(64) NOT NULL,
  PRIMARY KEY (user_id, client_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id VARCHAR(64) NOT NULL,
  permission_id INT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  actor_id VARCHAR(64) NOT NULL,
  actor_username VARCHAR(100) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  client_id VARCHAR(64),
  client_name VARCHAR(255),
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(64),
  operation VARCHAR(100) NOT NULL,
  outcome VARCHAR(50) NOT NULL,
  before_state JSON,
  after_state JSON,
  details JSON,
  timestamp VARCHAR(64) NOT NULL
);

-- Seed Roles: 1: super admin, 2: admin, 3: user
INSERT INTO roles (id, name, `rank`, description) VALUES
(1, 'super admin', 1, 'Super Administrator with full system access across all clients'),
(2, 'admin', 2, 'Client Administrator with management access restricted to assigned client'),
(3, 'user', 3, 'Standard Operational User')
ON DUPLICATE KEY UPDATE name=VALUES(name), `rank`=VALUES(`rank`);

-- Seed Default Client: test_client
INSERT INTO clients (id, name, db_key, description, root_folder_id, is_active, created_at, updated_at) VALUES
('test_client', 'Test Client', 'test_client', 'Default System Test Client Organization', NULL, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Seed Default Superadmin Account (admin / Admin@123)
-- Hash 7d20f317b9e34c36747cf8275645ab8fe145e29b70f3722a6fcd7d0cff2cd0c8 is salted double-SHA256 hash of 'Admin@123'
INSERT INTO users (id, username, full_name, password_hash, role_id, phone, email, is_active, created_at, updated_at) VALUES
('root-admin', 'admin', 'System Administrator', '7d20f317b9e34c36747cf8275645ab8fe145e29b70f3722a6fcd7d0cff2cd0c8', 1, NULL, 'admin@vapli.com', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- Link admin to test_client
INSERT IGNORE INTO user_client_access (user_id, client_id, granted_at) VALUES
('root-admin', 'test_client', NOW());

-- Seed Privileges
INSERT INTO permissions (code, name, category, description) VALUES
('open_admin_page', 'Open Admin Page', 'view', 'Access administration control panel'),
('view_admin_tanks', 'View Admin Tanks', 'view', 'View tank assets in admin mode'),
('view_admin_clients', 'View Admin Clients', 'view', 'View client list in admin mode'),
('view_admin_users', 'View Admin Users', 'view', 'View user list in admin mode'),
('view_settings', 'View Settings', 'view', 'View system configuration settings'),
('view_audit_logs', 'View Audit Logs', 'view', 'View audit logs and activity trail'),
('create_client', 'Create Client', 'action', 'Create new client scope'),
('create_users', 'Create Users', 'action', 'Create new user accounts'),
('grant_users', 'Grant Users', 'action', 'Modify user permissions & access'),
('create_tanks', 'Create Tanks', 'action', 'Create tank assets'),
('delete_tanks', 'Delete Tanks', 'action', 'Delete tank assets'),
('modify_tanks', 'Modify Tanks', 'action', 'Update tank asset details'),
('allocate_users_to_clients', 'Allocate Users to Clients', 'action', 'Assign users to client scopes'),
('change_settings', 'Change Settings', 'action', 'Modify system settings'),
('historical_upload', 'Historical Upload', 'action', 'Upload historical inspection readings')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Seed Default Role Permissions
-- Super Admin (role_id 1): All permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Admin (role_id 2): Admin permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE code IN (
  'open_admin_page', 'view_admin_tanks', 'view_admin_users', 'view_settings',
  'create_users', 'grant_users', 'create_tanks', 'delete_tanks', 'modify_tanks',
  'allocate_users_to_clients', 'change_settings'
);

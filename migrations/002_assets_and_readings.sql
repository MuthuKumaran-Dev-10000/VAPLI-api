-- VAPLI Assets, Tanks, Templates and Readings Migration

CREATE TABLE IF NOT EXISTS tank_nodes (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(20) NOT NULL DEFAULT 'folder',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  zone VARCHAR(255),
  parent_id VARCHAR(64),
  path VARCHAR(500) NOT NULL DEFAULT '',
  `order` INT NOT NULL DEFAULT 0,
  tank_id VARCHAR(64),
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS tanks (
  id VARCHAR(64) PRIMARY KEY,
  tank_code VARCHAR(100) NOT NULL,
  tank_name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  qr_json TEXT,
  qr_image_url TEXT,
  inspection_properties JSON,
  scale_min DOUBLE DEFAULT 0,
  scale_max DOUBLE DEFAULT 100,
  scale_side VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(64) NOT NULL,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  inspection_frequency_type VARCHAR(50) DEFAULT 'daily',
  inspection_frequency_days INT DEFAULT 1,
  `groups` JSON
);

CREATE TABLE IF NOT EXISTS parameter_templates (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  properties JSON NOT NULL,
  created_by VARCHAR(64),
  created_at VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS readings (
  id VARCHAR(64) PRIMARY KEY,
  tank_id VARCHAR(64) NOT NULL,
  node_id VARCHAR(64),
  recorded_by_id VARCHAR(64) NOT NULL,
  recorded_by_name VARCHAR(255) NOT NULL,
  recorded_by_role VARCHAR(50) NOT NULL,
  client_id VARCHAR(64),
  values_json JSON NOT NULL,
  timestamp VARCHAR(64) NOT NULL
);

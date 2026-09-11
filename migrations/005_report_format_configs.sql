-- Migration 005: Dedicated table for Report Format Configurations
CREATE TABLE IF NOT EXISTS report_format_configs (
  id VARCHAR(64) PRIMARY KEY,
  folder_id VARCHAR(64) NOT NULL,
  is_violation_mode BOOLEAN NOT NULL DEFAULT FALSE,
  pdf_strip_text VARCHAR(255) DEFAULT '',
  pdf_threshold_count INT DEFAULT 5,
  excel_threshold_count INT DEFAULT 10,
  param_key VARCHAR(128) NOT NULL,
  param_name VARCHAR(255) DEFAULT '',
  param_type VARCHAR(64) DEFAULT 'text',
  param_options JSON,
  selected BOOLEAN DEFAULT TRUE,
  abbreviation VARCHAR(64) DEFAULT '',
  order_index INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_folder_mode_param (folder_id, is_violation_mode, param_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

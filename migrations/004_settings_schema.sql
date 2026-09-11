-- System Settings Schema for VAPLI

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(191) PRIMARY KEY,
  setting_value JSON NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  updated_at VARCHAR(64) NOT NULL
);

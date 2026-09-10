-- Restructure Readings: Table for parameter value lines and parameter images per reading

CREATE TABLE IF NOT EXISTS reading_values (
  id VARCHAR(64) PRIMARY KEY,
  reading_id VARCHAR(64) NOT NULL,
  param_id VARCHAR(100) NOT NULL,
  param_label VARCHAR(255),
  param_type VARCHAR(50) DEFAULT 'numeric',
  val TEXT,
  numeric_val DOUBLE DEFAULT NULL,
  unit VARCHAR(50) DEFAULT NULL,
  min_val DOUBLE DEFAULT NULL,
  max_val DOUBLE DEFAULT NULL,
  is_violation TINYINT(1) DEFAULT 0,
  violation_message TEXT DEFAULT NULL,
  image_url TEXT DEFAULT NULL,
  created_at VARCHAR(64) NOT NULL,
  INDEX idx_reading_id (reading_id),
  INDEX idx_param_id (param_id)
);

CREATE TABLE IF NOT EXISTS reading_images (
  id VARCHAR(64) PRIMARY KEY,
  reading_id VARCHAR(64) NOT NULL,
  param_id VARCHAR(100) DEFAULT NULL,
  category VARCHAR(100) DEFAULT 'manual_capture_image',
  image_url TEXT NOT NULL,
  file_path TEXT DEFAULT NULL,
  annotations_json JSON DEFAULT NULL,
  created_at VARCHAR(64) NOT NULL,
  INDEX idx_reading_images_reading_id (reading_id),
  INDEX idx_reading_images_param_id (param_id)
);

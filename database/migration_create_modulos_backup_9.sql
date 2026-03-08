-- Módulo 9 - Backup Meilisearch a Dropbox

CREATE TABLE IF NOT EXISTS modulos_backup_9_config (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value TEXT
);

CREATE TABLE IF NOT EXISTS modulos_backup_9_sync_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  started_at DATETIME,
  finished_at DATETIME NULL,
  status ENUM('running','ok','error') DEFAULT 'running',
  file_name VARCHAR(255) NULL,
  dropbox_path VARCHAR(500) NULL,
  bytes_size INT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO modulos_backup_9_config (config_key, config_value) VALUES
  ('dropbox_folder_path', '/Aplicaciones/Zero Azul WORKERS/MEILISEARCH'),
  ('meilisearch_url', 'http://localhost:7700'),
  ('cron_secret', NULL);

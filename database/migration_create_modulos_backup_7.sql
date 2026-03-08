-- Módulo 7: Backup BD a Dropbox (sincronizaciones diarias)
-- Ejecutar: mysql -u USUARIO -p admin_dworkers < database/migration_create_modulos_backup_7.sql

CREATE TABLE IF NOT EXISTS modulos_backup_7_config (
  config_key VARCHAR(100) NOT NULL PRIMARY KEY,
  config_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modulos_backup_7_sync_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  status ENUM('running','ok','error') NOT NULL DEFAULT 'running',
  file_name VARCHAR(255) NULL,
  dropbox_path VARCHAR(512) NULL,
  bytes_size INT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claves: dropbox_access_token, dropbox_folder_path, cron_secret
INSERT IGNORE INTO modulos_backup_7_config (config_key, config_value) VALUES
  ('dropbox_folder_path', '/Aplicaciones/Zero Azul WORKERS'),
  ('cron_secret', NULL);

-- Migration: Crear tablas para el módulo Monitor Web CFA (id=18)
-- 
-- Tablas:
--   modulos_monitor_web_cfa_18_config - Configuración clave/valor
--   modulos_monitor_web_cfa_18_logs   - Historial de chequeos

CREATE TABLE IF NOT EXISTS `modulos_monitor_web_cfa_18_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(255) NOT NULL,
  `config_value` longtext,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar valores por defecto
INSERT INTO `modulos_monitor_web_cfa_18_config` (config_key, config_value) VALUES
  ('url', 'https://www.cfa.com.co/'),
  ('interval_minutes', '5'),
  ('enabled', '1')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

CREATE TABLE IF NOT EXISTS `modulos_monitor_web_cfa_18_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status_code` int DEFAULT NULL,
  `response_time_ms` int DEFAULT NULL,
  `content_valid` tinyint(1) NOT NULL DEFAULT '0',
  `content_length` int DEFAULT NULL,
  `error_message` text,
  `waf_detected` tinyint(1) NOT NULL DEFAULT '0',
  `checked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_checked_at` (`checked_at` DESC),
  KEY `idx_status_code` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
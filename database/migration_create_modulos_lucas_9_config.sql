-- Migración: Crear tabla de configuración para módulo Generador Carta Laboral (agent: lucas, agent_id: 9)
-- Módulo ID: 3
-- Versión: v1.0

USE admin_dworkers;

CREATE TABLE IF NOT EXISTS modulos_lucas_9_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuraciones iniciales del módulo
INSERT INTO modulos_lucas_9_config (config_key, config_value, is_encrypted, description) VALUES
('empresa_nombre',      'Autolarte',                   FALSE, 'Nombre de la empresa para la carta'),
('empresa_nit',         '',                            FALSE, 'NIT de la empresa'),
('empresa_direccion',   '',                            FALSE, 'Dirección de la empresa'),
('empresa_ciudad',      '',                            FALSE, 'Ciudad de la empresa'),
('firma_nombre',        '',                            FALSE, 'Nombre del firmante de la carta'),
('firma_cargo',         '',                            FALSE, 'Cargo del firmante'),
('openai_api_key',      '',                            TRUE,  'API Key de OpenAI para generación de cartas'),
('webhook_url',         '',                            FALSE, 'URL del webhook para notificaciones')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

SELECT
  CASE
    WHEN COUNT(*) > 0 THEN CONCAT('✅ Tabla modulos_lucas_9_config creada con ', COUNT(*), ' configuraciones')
    ELSE '❌ Error: tabla no creada'
  END AS resultado
FROM modulos_lucas_9_config;

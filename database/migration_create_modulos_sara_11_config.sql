-- Migración: tabla de configuración del módulo Llamada SARA (módulo 5, agente Sara id 11)
CREATE TABLE IF NOT EXISTS modulos_sara_11_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO modulos_sara_11_config (config_key, config_value, description) VALUES
  ('account_sid',    '', 'Twilio Account SID (ACxxxx...)'),
  ('api_key_sid',    '', 'Twilio API Key SID (SKxxxx...)'),
  ('api_key_secret', '', 'Twilio API Key Secret'),
  ('twiml_app_sid',  '', 'Twilio TwiML App SID (APxxxx...). Voice URL debe apuntar a /api/custom-module5/llamada-sara/twiml');

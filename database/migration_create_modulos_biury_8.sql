-- Migración: Módulo 8 - Biury Pagos → Siigo
-- Tablas: modulos_biury_8_config, modulos_biury_8_logs

CREATE TABLE IF NOT EXISTS modulos_biury_8_config (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modulos_biury_8_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id VARCHAR(100),
  customer_document VARCHAR(50),
  product_name VARCHAR(255),
  gateway VARCHAR(50),
  total DECIMAL(12,2),
  siigo_response TEXT,
  status ENUM('success', 'error', 'filtered') DEFAULT 'filtered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar config inicial
INSERT IGNORE INTO modulos_biury_8_config (config_key, config_value, is_encrypted, description) VALUES
('access_key', '', TRUE, 'Token de autenticación del webhook de Treli'),
('siigo_token', '', TRUE, 'Token API de Siigo (Bearer)');

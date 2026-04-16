-- Módulo 11: Logs de procesamiento
-- Ejecutar: mysql -u USUARIO -p admin_dworkers < database/migration_create_modulos_sistema_de_cambio_de_fondos_y_placas_11_logs.sql

CREATE TABLE IF NOT EXISTS modulos_sistema_de_cambio_de_fondos_y_placas_11_logs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  plate VARCHAR(32) NOT NULL,
  flow VARCHAR(20) NOT NULL,
  side VARCHAR(20) DEFAULT NULL,
  status VARCHAR(20) NOT NULL,
  step VARCHAR(60) DEFAULT NULL,
  input_url TEXT,
  output_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_plate (plate),
  KEY idx_flow (flow),
  KEY idx_status (status)
);

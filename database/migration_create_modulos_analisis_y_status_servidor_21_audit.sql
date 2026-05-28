-- Migración: tabla de auditoría SSH para módulo Analisis y status servidor (módulo 21)
CREATE TABLE IF NOT EXISTS modulos_analisis_y_status_servidor_21_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  command VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ok',
  output_preview VARCHAR(200) DEFAULT NULL,
  client_ip VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índice para rate limiting y limpieza
CREATE INDEX idx_audit_created_at ON modulos_analisis_y_status_servidor_21_audit(created_at);

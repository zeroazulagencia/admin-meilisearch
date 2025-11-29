-- Migración para crear la tabla de errores revisados
-- Versión: v25.0
-- Esta migración es idempotente y puede ejecutarse múltiples veces sin errores

USE admin_dworkers;

-- Crear tabla reviewed_errors si no existe
CREATE TABLE IF NOT EXISTS reviewed_errors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  execution_id VARCHAR(255) NOT NULL,
  workflow_id VARCHAR(255) NOT NULL,
  agent_id INT NOT NULL,
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INT,
  INDEX idx_execution_id (execution_id),
  INDEX idx_workflow_id (workflow_id),
  INDEX idx_agent_id (agent_id),
  INDEX idx_reviewed_at (reviewed_at),
  UNIQUE KEY unique_execution (execution_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Confirmar creación
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'Tabla reviewed_errors disponible' 
    ELSE 'Error: tabla reviewed_errors no creada'
  END AS resultado
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'admin_dworkers'
  AND TABLE_NAME = 'reviewed_errors';


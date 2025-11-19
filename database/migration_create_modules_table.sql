-- Migración para crear la tabla de módulos asociados a agentes
-- Versión: v24.0
-- Esta migración es idempotente y puede ejecutarse múltiples veces sin errores

USE admin_dworkers;

-- Crear tabla modules si no existe
CREATE TABLE IF NOT EXISTS modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_agent_id (agent_id),
  INDEX idx_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Confirmar creación
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'Tabla modules disponible' 
    ELSE 'Error: tabla modules no creada'
  END AS resultado
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'admin_dworkers'
  AND TABLE_NAME = 'modules';



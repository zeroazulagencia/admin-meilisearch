-- Migración para crear la tabla de conversaciones en modo humano
-- Versión: v27.0
-- Esta migración es idempotente y puede ejecutarse múltiples veces sin errores

USE admin_dworkers;

-- Crear tabla human_conversations si no existe
CREATE TABLE IF NOT EXISTS human_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  phone_number_id VARCHAR(255) NOT NULL,
  taken_by INT NOT NULL,
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP NULL,
  status ENUM('active', 'released') DEFAULT 'active',
  INDEX idx_agent_id (agent_id),
  INDEX idx_user_id (user_id),
  INDEX idx_phone_number_id (phone_number_id),
  INDEX idx_status (status),
  INDEX idx_taken_by (taken_by),
  INDEX idx_taken_at (taken_at),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (taken_by) REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE
  -- Nota: La lógica para asegurar que solo haya una conversación activa por (agent_id, user_id, phone_number_id)
  -- se manejará en la aplicación al insertar/actualizar registros
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Confirmar creación
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'Tabla human_conversations disponible' 
    ELSE 'Error: tabla human_conversations no creada'
  END AS resultado
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'admin_dworkers'
  AND TABLE_NAME = 'human_conversations';


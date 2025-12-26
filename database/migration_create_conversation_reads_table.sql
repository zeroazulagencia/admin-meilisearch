-- Migración para crear la tabla de rastreo de mensajes leídos
-- Versión: v28.0
-- Esta migración es idempotente y puede ejecutarse múltiples veces sin errores

USE admin_dworkers;

-- Crear tabla conversation_reads si no existe
CREATE TABLE IF NOT EXISTS conversation_reads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  phone_number_id VARCHAR(255) NOT NULL,
  read_by INT NOT NULL COMMENT 'client_id del usuario que leyó',
  last_read_datetime TIMESTAMP NULL COMMENT 'Último mensaje visto por el usuario',
  last_message_datetime TIMESTAMP NOT NULL COMMENT 'Último mensaje disponible en Meilisearch',
  unread_count INT DEFAULT 0 COMMENT 'Cantidad de mensajes no leídos',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_conversation_read (agent_id, user_id, phone_number_id, read_by),
  INDEX idx_agent_id (agent_id),
  INDEX idx_user_id (user_id),
  INDEX idx_phone_number_id (phone_number_id),
  INDEX idx_read_by (read_by),
  INDEX idx_last_message_datetime (last_message_datetime),
  INDEX idx_unread_count (unread_count),
  INDEX idx_agent_read_by (agent_id, read_by),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (read_by) REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Confirmar creación
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'Tabla conversation_reads disponible' 
    ELSE 'Error: tabla conversation_reads no creada'
  END AS resultado
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'admin_dworkers'
  AND TABLE_NAME = 'conversation_reads';


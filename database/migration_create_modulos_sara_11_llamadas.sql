-- Migración: tabla de llamadas del módulo Llamada SARA (módulo 5, agente Sara id 11)
CREATE TABLE IF NOT EXISTS modulos_sara_11_llamadas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(50) UNIQUE NOT NULL,
  estado ENUM('activa', 'finalizada', 'cancelada') DEFAULT 'activa',
  creado_por VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

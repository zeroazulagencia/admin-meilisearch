-- Migracion v2: Refactorizacion modulo SARA Voice Calls (modulo 5, agente Sara id 11)

-- 1. Tabla de asesores para control de estado online/offline/ocupado
CREATE TABLE IF NOT EXISTS modulos_sara_11_asesores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asesor_id VARCHAR(100) UNIQUE NOT NULL DEFAULT 'admin',
  estado ENUM('offline','online','ocupado') DEFAULT 'offline',
  room_activo VARCHAR(50) NULL,
  ultima_actividad TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO modulos_sara_11_asesores (asesor_id, estado) VALUES ('admin', 'offline');

-- 2. Nuevas columnas en tabla de llamadas
ALTER TABLE modulos_sara_11_llamadas
  ADD COLUMN IF NOT EXISTS cliente_id VARCHAR(100) NULL AFTER creado_por,
  ADD COLUMN IF NOT EXISTS inicio_llamada TIMESTAMP NULL AFTER cliente_id,
  ADD COLUMN IF NOT EXISTS fin_llamada TIMESTAMP NULL AFTER inicio_llamada,
  ADD COLUMN IF NOT EXISTS duracion_segundos INT NULL AFTER fin_llamada,
  ADD COLUMN IF NOT EXISTS recording_url TEXT NULL AFTER duracion_segundos;

-- 3. Config para grabacion
INSERT IGNORE INTO modulos_sara_11_config (config_key, config_value, description)
  VALUES ('enable_recording', 'true', 'Habilitar grabacion de conferencias (storage: $0.0005/min/mes)');

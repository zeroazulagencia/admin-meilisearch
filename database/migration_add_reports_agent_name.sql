-- Migración: Agregar columna reports_agent_name a la tabla agents
-- Versión: v18.8

USE admin_dworkers;

-- Verificar si la columna existe antes de agregarla
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'admin_dworkers' 
    AND TABLE_NAME = 'agents' 
    AND COLUMN_NAME = 'reports_agent_name'
);

-- Agregar columna reports_agent_name si no existe
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE agents ADD COLUMN reports_agent_name VARCHAR(255) NULL AFTER conversation_agent_name',
    'SELECT "La columna reports_agent_name ya existe" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar si el índice existe antes de crearlo
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'admin_dworkers' 
    AND TABLE_NAME = 'agents' 
    AND INDEX_NAME = 'idx_reports_agent_name'
);

-- Crear índice para mejorar búsquedas si no existe
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_reports_agent_name ON agents(reports_agent_name)',
    'SELECT "El índice idx_reports_agent_name ya existe" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


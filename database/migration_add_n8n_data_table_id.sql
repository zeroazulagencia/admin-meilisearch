-- Migración para agregar campo n8n_data_table_id a la tabla agents
-- Versión: v24.0
-- IMPORTANTE: Esta migración es segura y no afecta datos existentes

USE admin_dworkers;

-- Verificar si la columna ya existe antes de añadirla
SET @col_exists_n8n_data_table_id = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'n8n_data_table_id'
);

-- Agregar columna si no existe
SET @sql = IF(@col_exists_n8n_data_table_id = 0, 
  'ALTER TABLE agents ADD COLUMN n8n_data_table_id VARCHAR(255) NULL AFTER whatsapp_app_secret;', 
  'SELECT "n8n_data_table_id already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar que la columna fue agregada correctamente
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'Columna n8n_data_table_id agregada exitosamente'
    ELSE 'Error: La columna no fue agregada'
  END AS resultado
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'admin_dworkers' 
AND TABLE_NAME = 'agents' 
AND COLUMN_NAME = 'n8n_data_table_id';




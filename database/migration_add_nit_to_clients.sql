-- Migración para agregar campo NIT a la tabla clients
-- Versión: v20.0

USE admin_dworkers;

-- Verificar si la columna ya existe antes de añadirla
SET @col_exists_nit = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'clients' 
  AND COLUMN_NAME = 'nit'
);

-- Agregar columna si no existe
SET @sql = IF(@col_exists_nit = 0, 
  'ALTER TABLE clients ADD COLUMN nit VARCHAR(50) NULL AFTER company;', 
  'SELECT "nit already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


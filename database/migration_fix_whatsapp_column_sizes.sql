-- Migración para corregir el tamaño de las columnas de WhatsApp
-- Versión: v19.1
-- Problema: whatsapp_app_secret y whatsapp_webhook_verify_token son VARCHAR(255) pero los valores encriptados son más largos

USE admin_dworkers;

-- Verificar si las columnas existen antes de modificarlas
SET @col_exists_whatsapp_webhook_verify_token = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'whatsapp_webhook_verify_token'
);

SET @col_exists_whatsapp_app_secret = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'whatsapp_app_secret'
);

-- Modificar whatsapp_webhook_verify_token a TEXT si existe
SET @sql = IF(@col_exists_whatsapp_webhook_verify_token > 0, 
  'ALTER TABLE agents MODIFY COLUMN whatsapp_webhook_verify_token TEXT NULL;', 
  'SELECT "whatsapp_webhook_verify_token does not exist" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modificar whatsapp_app_secret a TEXT si existe
SET @sql = IF(@col_exists_whatsapp_app_secret > 0, 
  'ALTER TABLE agents MODIFY COLUMN whatsapp_app_secret TEXT NULL;', 
  'SELECT "whatsapp_app_secret does not exist" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- Migración de verificación y creación de columnas de WhatsApp
-- Versión: v25.1
-- IMPORTANTE: Esta migración es segura y puede ejecutarse múltiples veces
-- NO modifica datos existentes, solo agrega columnas si no existen

USE admin_dworkers;

-- Verificar y agregar whatsapp_business_account_id
SET @col_exists_whatsapp_business_account_id = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'whatsapp_business_account_id'
);

SET @sql = IF(@col_exists_whatsapp_business_account_id = 0, 
  'ALTER TABLE agents ADD COLUMN whatsapp_business_account_id VARCHAR(255) NULL AFTER reports_agent_name;', 
  'SELECT "whatsapp_business_account_id already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar whatsapp_phone_number_id
SET @col_exists_whatsapp_phone_number_id = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'whatsapp_phone_number_id'
);

SET @sql = IF(@col_exists_whatsapp_phone_number_id = 0, 
  'ALTER TABLE agents ADD COLUMN whatsapp_phone_number_id VARCHAR(255) NULL AFTER whatsapp_business_account_id;', 
  'SELECT "whatsapp_phone_number_id already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar whatsapp_access_token
SET @col_exists_whatsapp_access_token = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'whatsapp_access_token'
);

SET @sql = IF(@col_exists_whatsapp_access_token = 0, 
  'ALTER TABLE agents ADD COLUMN whatsapp_access_token TEXT NULL AFTER whatsapp_phone_number_id;', 
  'SELECT "whatsapp_access_token already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar whatsapp_webhook_verify_token
SET @col_exists_whatsapp_webhook_verify_token = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'whatsapp_webhook_verify_token'
);

SET @sql = IF(@col_exists_whatsapp_webhook_verify_token = 0, 
  'ALTER TABLE agents ADD COLUMN whatsapp_webhook_verify_token TEXT NULL AFTER whatsapp_access_token;', 
  'SELECT "whatsapp_webhook_verify_token already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar whatsapp_app_secret
SET @col_exists_whatsapp_app_secret = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'whatsapp_app_secret'
);

SET @sql = IF(@col_exists_whatsapp_app_secret = 0, 
  'ALTER TABLE agents ADD COLUMN whatsapp_app_secret TEXT NULL AFTER whatsapp_webhook_verify_token;', 
  'SELECT "whatsapp_app_secret already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar que todas las columnas existen
SELECT 
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ Todas las columnas de WhatsApp existen correctamente'
    ELSE CONCAT('⚠️  Solo ', COUNT(*), ' de 5 columnas existen')
  END AS resultado
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'admin_dworkers' 
AND TABLE_NAME = 'agents' 
AND COLUMN_NAME IN (
  'whatsapp_business_account_id',
  'whatsapp_phone_number_id',
  'whatsapp_access_token',
  'whatsapp_webhook_verify_token',
  'whatsapp_app_secret'
);


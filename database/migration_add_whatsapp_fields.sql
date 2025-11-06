-- Migración para agregar campos de WhatsApp a la tabla agents
-- Versión: v19.0

USE admin_dworkers;

-- Verificar si las columnas ya existen antes de añadirlas
SET @col_exists_whatsapp_business_account_id = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'whatsapp_business_account_id'
);

SET @col_exists_whatsapp_phone_number_id = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'whatsapp_phone_number_id'
);

SET @col_exists_whatsapp_access_token = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'admin_dworkers' 
  AND TABLE_NAME = 'agents' 
  AND COLUMN_NAME = 'whatsapp_access_token'
);

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

-- Agregar columnas si no existen
SET @sql = IF(@col_exists_whatsapp_business_account_id = 0, 
  'ALTER TABLE agents ADD COLUMN whatsapp_business_account_id VARCHAR(255) NULL AFTER reports_agent_name;', 
  'SELECT "whatsapp_business_account_id already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@col_exists_whatsapp_phone_number_id = 0, 
  'ALTER TABLE agents ADD COLUMN whatsapp_phone_number_id VARCHAR(255) NULL AFTER whatsapp_business_account_id;', 
  'SELECT "whatsapp_phone_number_id already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@col_exists_whatsapp_access_token = 0, 
  'ALTER TABLE agents ADD COLUMN whatsapp_access_token TEXT NULL AFTER whatsapp_phone_number_id;', 
  'SELECT "whatsapp_access_token already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@col_exists_whatsapp_webhook_verify_token = 0, 
  'ALTER TABLE agents ADD COLUMN whatsapp_webhook_verify_token VARCHAR(255) NULL AFTER whatsapp_access_token;', 
  'SELECT "whatsapp_webhook_verify_token already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@col_exists_whatsapp_app_secret = 0, 
  'ALTER TABLE agents ADD COLUMN whatsapp_app_secret VARCHAR(255) NULL AFTER whatsapp_webhook_verify_token;', 
  'SELECT "whatsapp_app_secret already exists" AS message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


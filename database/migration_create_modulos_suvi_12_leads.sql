-- Migración: Crear tabla de logs de leads para módulo SUVI (agente_id: 12)
-- Versión: v1.0
-- Esta tabla almacena todo el proceso de leads desde Facebook hasta Salesforce

USE admin_dworkers;

CREATE TABLE IF NOT EXISTS modulos_suvi_12_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Info del lead de Facebook
  leadgen_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'ID único del lead en Facebook',
  page_id VARCHAR(255) COMMENT 'ID de la página de Facebook',
  form_id VARCHAR(255) COMMENT 'ID del formulario de Facebook',
  campaign_name VARCHAR(500) COMMENT 'Nombre de la campaña',
  ad_name VARCHAR(500) COMMENT 'Nombre del anuncio',
  
  -- Datos originales del lead (JSON)
  facebook_raw_data JSON COMMENT 'Datos originales de Facebook',
  facebook_cleaned_data JSON COMMENT 'Datos limpios (campo-valor)',
  
  -- Datos enriquecidos por IA
  ai_enriched_data JSON COMMENT 'Datos procesados por OpenAI',
  ai_summary TEXT COMMENT 'Resumen generado por IA',
  
  -- Clasificación
  campaign_type ENUM('Pauta Agencia', 'Pauta Interna') COMMENT 'Tipo de campaña',
  opportunity_type_id VARCHAR(50) COMMENT 'ID del tipo de oportunidad en Salesforce',
  
  -- Info de Salesforce
  salesforce_account_id VARCHAR(50) COMMENT 'ID de la cuenta en Salesforce',
  salesforce_account_name VARCHAR(255) COMMENT 'Nombre de la cuenta en Salesforce',
  salesforce_opportunity_id VARCHAR(50) COMMENT 'ID de la oportunidad creada',
  salesforce_owner_id VARCHAR(50) COMMENT 'ID del dueño asignado',
  salesforce_project_id VARCHAR(50) COMMENT 'ID del proyecto en Salesforce',
  
  -- Estado del procesamiento
  processing_status ENUM(
    'recibido', 
    'consultando_facebook', 
    'limpiando_datos', 
    'enriqueciendo_ia', 
    'clasificando', 
    'creando_cuenta', 
    'creando_oportunidad', 
    'completado', 
    'error'
  ) DEFAULT 'recibido',
  current_step VARCHAR(100) COMMENT 'Paso actual del proceso',
  error_message TEXT COMMENT 'Mensaje de error si falla',
  error_step VARCHAR(100) COMMENT 'Paso donde ocurrió el error',
  
  -- Métricas de tiempo
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Cuándo se recibió',
  facebook_fetched_at TIMESTAMP NULL COMMENT 'Cuándo se consultó Facebook',
  ai_processed_at TIMESTAMP NULL COMMENT 'Cuándo se procesó con IA',
  salesforce_account_created_at TIMESTAMP NULL COMMENT 'Cuándo se creó/actualizó cuenta',
  salesforce_opportunity_created_at TIMESTAMP NULL COMMENT 'Cuándo se creó oportunidad',
  completed_at TIMESTAMP NULL COMMENT 'Cuándo se completó todo',
  processing_time_seconds INT COMMENT 'Tiempo total de procesamiento',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_leadgen_id (leadgen_id),
  INDEX idx_processing_status (processing_status),
  INDEX idx_received_at (received_at),
  INDEX idx_campaign_type (campaign_type),
  INDEX idx_salesforce_account_id (salesforce_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar datos de ejemplo para testing
INSERT INTO modulos_suvi_12_leads (
  leadgen_id,
  page_id,
  form_id,
  campaign_name,
  ad_name,
  facebook_raw_data,
  facebook_cleaned_data,
  ai_enriched_data,
  ai_summary,
  campaign_type,
  salesforce_account_id,
  salesforce_account_name,
  salesforce_opportunity_id,
  processing_status,
  current_step,
  received_at,
  completed_at,
  processing_time_seconds
) VALUES
(
  'FB_LEAD_12345',
  'PAGE_789',
  'FORM_456',
  'Campaña SUVI - Bogotá 2024',
  'Anuncio Apartamentos Norte',
  '{"field_data":[{"name":"full_name","values":["Juan Pérez"]},{"name":"email","values":["juan@mail.com"]},{"name":"phone_number","values":["3011234567"]}]}',
  '{"Nombre":"Juan Pérez","Email":"juan@mail.com","Teléfono":"3011234567"}',
  '{"nombre_completo":"Juan Pérez","email":"juan@mail.com","telefono":"+57 3011234567","pais":"Colombia","servicio":"Apartamento"}',
  'Lead interesado en apartamento en zona norte de Bogotá',
  'Pauta Interna',
  'SF_ACC_001',
  'Juan Pérez',
  'SF_OPP_001',
  'completado',
  'Oportunidad creada',
  DATE_SUB(NOW(), INTERVAL 1 HOUR),
  DATE_SUB(NOW(), INTERVAL 50 MINUTE),
  600
),
(
  'FB_LEAD_67890',
  'PAGE_789',
  'FORM_456',
  'Agencia Digital - SUVI',
  'Anuncio Casa Sur',
  '{"field_data":[{"name":"full_name","values":["María López"]},{"name":"email","values":["maria@example.com"]},{"name":"phone_number","values":["3159876543"]}]}',
  '{"Nombre":"María López","Email":"maria@example.com","Teléfono":"3159876543"}',
  NULL,
  NULL,
  'Pauta Agencia',
  NULL,
  NULL,
  NULL,
  'enriqueciendo_ia',
  'Procesando con IA',
  DATE_SUB(NOW(), INTERVAL 10 MINUTE),
  NULL,
  NULL
),
(
  'FB_LEAD_11111',
  'PAGE_789',
  'FORM_456',
  'Campaña Test Error',
  'Anuncio Error',
  '{"field_data":[{"name":"full_name","values":["Error Test"]}]}',
  '{"Nombre":"Error Test"}',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'error',
  'Error en API de Facebook',
  DATE_SUB(NOW(), INTERVAL 5 MINUTE),
  NULL,
  NULL
);

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN CONCAT('✅ Tabla modulos_suvi_12_leads creada con ', COUNT(*), ' registros de ejemplo') 
    ELSE '❌ Error: tabla no creada'
  END AS resultado
FROM modulos_suvi_12_leads;

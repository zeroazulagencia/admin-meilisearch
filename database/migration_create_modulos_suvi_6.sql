-- Migración: Módulo 6 SUVI Opportunity (Ventas / Crédito)
-- Tablas: modulos_suvi_6_opportunities, modulos_suvi_6_config
-- OAuth Salesforce: se reutiliza del módulo 1 (modulos_suvi_12_config)

USE admin_dworkers;

CREATE TABLE IF NOT EXISTS modulos_suvi_6_config (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO modulos_suvi_6_config (config_key, config_value, is_encrypted, description) VALUES
('webhook_secret', '', TRUE, 'Token para validar POST a webhooks ventas/credito (header X-Webhook-Token)'),
('salesforce_group_id_ventas', '00G4W000006rHIN', FALSE, 'GroupId Salesforce para ruleta de asesores Ventas'),
('salesforce_group_id_credito', '00G4W000006rHII', FALSE, 'GroupId Salesforce para ruleta de asesores Crédito'),
('record_type_ventas', '0124W000000OiIrQAK', FALSE, 'RecordTypeId oportunidad Ventas'),
('record_type_credito', '0124W000000OiImQAK', FALSE, 'RecordTypeId oportunidad Crédito'),
('valid_project_ids', '["a044W00000uLBwkQAG","a044W00000uLBwlQAG","a044W00000uLBwdQAG","a044W00000uLBwbQAG","a044W00000uLBwWQAW","a044W00000uLBwVQAW","a044W00000uLBwcQAG","a044W00000uLBwiQAG","a044W00000uMggAQAS","a044W00000uLBwaQAG","a044W00000uLp0sQAC","a044W00000uLBwgQAG","a04QU00000C6uyHYAR","a044W00000uLBweQAG","a044W00000uLBwjQAG"]', FALSE, 'IDs de proyectos válidos (JSON)')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

CREATE TABLE IF NOT EXISTS modulos_suvi_6_opportunities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255) NOT NULL,
  telefono VARCHAR(100) NOT NULL,
  pais VARCHAR(100) NULL,
  indicativo VARCHAR(20) NULL,
  ciudad VARCHAR(100) NULL,
  nombre_proyecto VARCHAR(255) NULL COMMENT 'Nombre del proyecto enviado en payload',
  tipo ENUM('ventas','credito') NOT NULL,
  salesforce_account_id VARCHAR(50) NULL,
  salesforce_opportunity_id VARCHAR(50) NULL,
  salesforce_owner_id VARCHAR(50) NULL,
  proyecto_id VARCHAR(50) NULL COMMENT 'Id Proyecto__c usado',
  payload_raw JSON NULL,
  processing_status ENUM('recibido','creando_cuenta','creando_oportunidad','completado','error') DEFAULT 'recibido',
  current_step VARCHAR(150) NULL,
  error_message TEXT NULL,
  error_step VARCHAR(100) NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_tipo (tipo),
  INDEX idx_processing_status (processing_status),
  INDEX idx_received_at (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

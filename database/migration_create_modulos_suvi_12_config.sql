-- Migración: Crear tabla de configuración para módulo SUVI
-- Versión: v1.0
-- Almacena credenciales y configuración específica del módulo

USE admin_dworkers;

CREATE TABLE IF NOT EXISTS modulos_suvi_12_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuraciones iniciales
INSERT INTO modulos_suvi_12_config (config_key, config_value, is_encrypted, description) VALUES
('facebook_app_id', '1997100487493360', FALSE, 'Facebook App ID'),
('facebook_app_secret', '', TRUE, 'Facebook App Secret (debe configurarse)'),
('facebook_access_token', '', TRUE, 'Facebook Access Token para Graph API'),
('openai_api_key', 'sk-proj-J2nSrXwHa0z7Ipr6h2UE9ku7SK_OPENAI_API_KEY_REDACTED3BlbkFJB8xXTUsTP0zNbVlQL_euLKX5NBTOXX4z-l5hT4FQPb5G22MnFPeXeKWtK2flrR6pfxwuXvlPEA', TRUE, 'OpenAI API Key'),
('salesforce_instance_url', 'https://suvivienda.my.salesforce.com', FALSE, 'Salesforce Instance URL'),
('salesforce_access_token', '', TRUE, 'Salesforce Access Token (debe configurarse)'),
('salesforce_group_id', '00G4W000006rHIN', FALSE, 'Salesforce Group ID para asignación de Owner'),
('salesforce_opportunity_type_id', '0124W000000OiIrQAK', FALSE, 'ID del tipo de oportunidad en Salesforce'),
('agency_campaigns', '["E3D Grupo 3 Inversionistas"]', FALSE, 'Lista de campañas de agencia (JSON)'),
('suvi_campaigns', '["Grupo 2 Familia", "Retiro-Julio"]', FALSE, 'Lista de campañas SUVI (JSON)'),
('blocked_form_ids', '["89751125275289511","1390845425341360","1311122467067306","1755880895295036","1532914084730608","827258693114555","1525347242041028","1153423046389388"]', FALSE, 'IDs de formularios bloqueados (JSON)'),
('valid_project_ids', '["a044W00000uLBwkQAG","a044W00000uLBwlQAG","a044W00000uLBwdQAG","a044W00000uLBwbQAG","a044W00000uLBwWQAW","a044W00000uLBwVQAW","a044W00000uLBwcQAG","a044W00000uLBwiQAG","a044W00000uMggAQAS","a044W00000uLBwaQAG","a044W00000uLp0sQAC","a044W00000uLBwgQAG","a04QU00000C6uyHYAR","a044W00000uLBweQAG","a044W00000uLBwjQAG"]', FALSE, 'IDs de proyectos válidos en Salesforce (JSON)')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN CONCAT('✅ Tabla modulos_suvi_12_config creada con ', COUNT(*), ' configuraciones') 
    ELSE '❌ Error: tabla no creada'
  END AS resultado
FROM modulos_suvi_12_config;

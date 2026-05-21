-- Modulo 17: Precios Condicionales N de Santander
-- Ejecutar: mysql -u USUARIO -p admin_dworkers < database/migration_create_modulos_precios_condicionales_17.sql

CREATE TABLE IF NOT EXISTS modulos_precios_condicionales_17_config (
  config_key VARCHAR(100) NOT NULL PRIMARY KEY,
  config_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modulos_precios_condicionales_17_logs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(64) NULL,
  resolved_state VARCHAR(120) NULL,
  resolved_country_code VARCHAR(10) NULL,
  shipping_state VARCHAR(120) NULL,
  shipping_country_code VARCHAR(10) NULL,
  target_state VARCHAR(120) NULL,
  require_shipping_match TINYINT(1) NOT NULL DEFAULT 1,
  discount_type VARCHAR(30) NULL,
  discount_value DECIMAL(10,2) NULL,
  applied TINYINT(1) NOT NULL DEFAULT 0,
  reason VARCHAR(120) NULL,
  request_payload LONGTEXT NULL,
  response_payload LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_event_type (event_type),
  KEY idx_created_at (created_at),
  KEY idx_applied (applied)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO modulos_precios_condicionales_17_config (config_key, config_value) VALUES
  ('enabled', '0'),
  ('target_country_code', 'CO'),
  ('target_state', 'Norte de Santander'),
  ('discount_type', 'percentage'),
  ('discount_value', '0'),
  ('require_shipping_match', '1'),
  ('state_aliases', '["Norte de Santander","N. de Santander","Norte Santander"]'),
  ('ipwhois_base_url', 'https://ipwho.is'),
  ('shopify_shop_domain', NULL),
  ('shopify_admin_access_token', NULL),
  ('shopify_api_key', NULL),
  ('shopify_api_secret', NULL),
  ('shopify_webhook_secret', NULL),
  ('shopify_bridge_secret', NULL),
  ('shopify_storefront_access_token', NULL);

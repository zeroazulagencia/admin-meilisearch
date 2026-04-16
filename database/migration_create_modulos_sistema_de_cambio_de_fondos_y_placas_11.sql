-- Módulo 11: Sistema de cambio de fondos y ocultamiento de placas
-- Ejecutar: mysql -u USUARIO -p admin_dworkers < database/migration_create_modulos_sistema_de_cambio_de_fondos_y_placas_11.sql

CREATE TABLE IF NOT EXISTS modulos_sistema_de_cambio_de_fondos_y_placas_11_config (
  config_key VARCHAR(120) NOT NULL PRIMARY KEY,
  config_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO modulos_sistema_de_cambio_de_fondos_y_placas_11_config (config_key, config_value) VALUES
  ('autolarte_base_url', 'https://autolarte.com.co'),
  ('uploads_path', '/wp-content/uploads/usados'),
  ('cronjobs_path', '/dev/cronjobs'),
  ('plate_assistant_path', '/dev/endpoints/plate-assistant'),
  ('replicate_model', 'bria/generate-background'),
  ('rapidapi_host', 'cars-image-background-removal.p.rapidapi.com'),
  ('rapidapi_endpoint', '/v1/results?mode=fg-image-shadow-hideclp'),
  ('prompt_default', 'In the city, clean background, no text, no people, no other vehicles'),
  ('category_json_path', '/dev/cronjobs/category.json'),
  ('vehicles_json_path', '/dev/endpoints/plate-assistant/vehicles.json'),
  ('server_search_url', 'https://server-search.zeroazul.com');

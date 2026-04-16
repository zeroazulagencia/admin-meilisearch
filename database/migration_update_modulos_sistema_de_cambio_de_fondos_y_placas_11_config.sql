-- Módulo 11: Nuevas llaves de configuracion
-- Ejecutar: mysql -u USUARIO -p admin_dworkers < database/migration_update_modulos_sistema_de_cambio_de_fondos_y_placas_11_config.sql

INSERT IGNORE INTO modulos_sistema_de_cambio_de_fondos_y_placas_11_config (config_key, config_value) VALUES
  ('wp_db_host', 'localhost'),
  ('wp_db_port', '3306'),
  ('wp_db_name', ''),
  ('wp_db_user', ''),
  ('wp_db_password', ''),
  ('wp_table_prefix', 'krh_'),
  ('wp_api_base_url', 'https://autolarte.com.co'),
  ('wp_api_token', ''),
  ('wp_api_upload_endpoint', '/wp-json/za-plate/v1/upload'),
  ('wp_api_override_endpoint', '/wp-json/za-plate/v1/override'),
  ('wp_api_list_large_endpoint', '/wp-json/za-plate/v1/list-large'),
  ('cron_times', '06:00,12:00,18:00');

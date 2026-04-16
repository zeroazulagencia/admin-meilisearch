-- Módulo 11: Valor por defecto para wp_api_token
-- Ejecutar: mysql -u USUARIO -p admin_dworkers < database/migration_set_default_wp_api_token_11.sql

UPDATE modulos_sistema_de_cambio_de_fondos_y_placas_11_config
SET config_value = 'usuario:app_password'
WHERE config_key = 'wp_api_token'
  AND (config_value IS NULL OR config_value = '');

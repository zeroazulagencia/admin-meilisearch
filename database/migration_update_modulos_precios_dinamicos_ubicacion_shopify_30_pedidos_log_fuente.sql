-- Módulo 30: fuente de la ubicación en el log de pedidos (gps | ip | ip-movil)
-- Ejecutar: mysql -u USUARIO -p admin_dworkers < database/migration_update_modulos_precios_dinamicos_ubicacion_shopify_30_pedidos_log_fuente.sql

ALTER TABLE modulos_precios_dinamicos_ubicacion_shopify_30_pedidos_log
  ADD COLUMN fuente VARCHAR(10) DEFAULT NULL AFTER user_agent;

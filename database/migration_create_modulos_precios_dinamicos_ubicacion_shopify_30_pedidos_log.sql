-- Módulo 30: log de solicitudes de pedidos (POST /checkout/)
-- Retención: 5 días (la purga la hace utils/modulos/precios-dinamicos-ubicacion-shopify-30/pedidos-log.ts)
-- Ejecutar: mysql -u USUARIO -p admin_dworkers < database/migration_create_modulos_precios_dinamicos_ubicacion_shopify_30_pedidos_log.sql

CREATE TABLE IF NOT EXISTS modulos_precios_dinamicos_ubicacion_shopify_30_pedidos_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  http_status SMALLINT NOT NULL,
  resultado VARCHAR(20) NOT NULL,
  error VARCHAR(255) DEFAULT NULL,
  ip VARCHAR(64) DEFAULT NULL,
  origin VARCHAR(255) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  ciudad VARCHAR(120) DEFAULT NULL,
  region VARCHAR(120) DEFAULT NULL,
  regla VARCHAR(120) DEFAULT NULL,
  descuento DECIMAL(6,2) DEFAULT NULL,
  items TEXT,
  lineas TEXT,
  draft_order_id BIGINT DEFAULT NULL,
  duracion_ms INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_created_at (created_at),
  KEY idx_resultado (resultado)
);

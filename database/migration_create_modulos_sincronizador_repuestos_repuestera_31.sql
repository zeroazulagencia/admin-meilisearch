-- Módulo 31: Sincronizador Repuestos Repuestera (ERP Repuestera -> WooCommerce repuestera.com.co)
-- Ejecutar: mysql -u USUARIO -p admin_dworkers < database/migration_create_modulos_sincronizador_repuestos_repuestera_31.sql
-- Las credenciales NO van aquí: se cargan cifradas desde la pestaña Configuración del módulo.

CREATE TABLE IF NOT EXISTS modulos_sincronizador_repuestos_repuestera_31_config (
  config_key VARCHAR(100) NOT NULL PRIMARY KEY,
  config_value TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Una fila por corrida (botón de WordPress, cron o manual desde el módulo)
CREATE TABLE IF NOT EXISTS modulos_sincronizador_repuestos_repuestera_31_runs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  origen VARCHAR(20) NOT NULL,
  simulacion TINYINT(1) NOT NULL DEFAULT 1,
  forzado TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  paso VARCHAR(120) DEFAULT NULL,
  motivo_error TEXT DEFAULT NULL,
  total_erp INT DEFAULT NULL,
  creados INT NOT NULL DEFAULT 0,
  actualizados INT NOT NULL DEFAULT 0,
  sin_cambios INT NOT NULL DEFAULT 0,
  errores INT NOT NULL DEFAULT 0,
  stats LONGTEXT DEFAULT NULL,
  callback_status VARCHAR(40) DEFAULT NULL,
  pid INT DEFAULT NULL,
  started_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL DEFAULT NULL,
  duracion_segundos INT DEFAULT NULL,
  KEY idx_status (status),
  KEY idx_started_at (started_at)
);

-- Detalle por producto y por evento de cada corrida
CREATE TABLE IF NOT EXISTS modulos_sincronizador_repuestos_repuestera_31_logs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  run_id INT NOT NULL,
  sku VARCHAR(100) DEFAULT NULL,
  accion VARCHAR(30) NOT NULL,
  resultado VARCHAR(20) NOT NULL,
  detalle TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_run (run_id),
  KEY idx_sku (sku),
  KEY idx_created_at (created_at)
);

-- Parámetros no sensibles con sus valores por defecto (los mismos del workflow n8n CzgPuZ3f5m4Mx6V6)
INSERT IGNORE INTO modulos_sincronizador_repuestos_repuestera_31_config (config_key, config_value) VALUES
  ('erp_base_url', 'http://181.49.158.60:8133'),
  ('woo_base_url', 'https://repuestera.com.co/wp-json/wc/v3'),
  ('wp_callback_url', 'https://repuestera.com.co/wp-admin/admin-ajax.php?action=repuestera_sync_callback'),
  ('modo_simulacion', '1'),
  ('tamano_lote', '50'),
  ('max_categorias_nuevas', '100'),
  ('min_ratio_erp', '0.7'),
  ('max_huerfanos', '300'),
  ('skus_excluidos', '1876100934*I, 24591033*I, 25187787*I, 25190335*I, 25195064*I, 25198942*I, 25199824*I, 25199828*I, 25199831*I, 25208379*I, 26436497, 40009039*I, 52135465*I, 55354237*I, 55563957*I, 5876100110*I, 5876100210*I, 5876101170*G, 7551854740*G, 8943958822*G, 8943965891*G, 8944489841*I, 8971229370*G, 8971846991*G, 8973720771*G, 8976067680*G, 8980288750*G, 8980401250*G, 8980549950*G, 8980792480*G, 8982029110*G, 93744675*I, 94535473*I, 94535475*I, 94580313*I, 96182634*I, 96253544*I, 96325867*I, 96353002*I, 96416270*I, 96815490*I');

CREATE TABLE IF NOT EXISTS `modulos_sincronizador_usados_autolarte_19_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config_key` varchar(255) NOT NULL,
  `config_value` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `modulos_sincronizador_usados_autolarte_19_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `placa` varchar(20) DEFAULT NULL,
  `operacion` varchar(50) DEFAULT NULL,
  `resultado` text,
  `status` varchar(50) DEFAULT NULL,
  `detalle` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `placa` (`placa`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Config inicial
INSERT IGNORE INTO `modulos_sincronizador_usados_autolarte_19_config` (`config_key`, `config_value`) VALUES
('wp_url', 'https://autolarte.com.co'),
('wp_auth', 'Basic ZGFuaWVsLmNvcnJlYTpYU0FldnBeRGRyUHhlcSUk'),
('inventario_url', 'https://autolarte.concesionariovirtual.co/usados/parametros/inventario.json'),
('reports_agent_name', 'sincronizador-usados-autolarte'),
('enabled', '1'),
('ultima_sincronizacion', '');
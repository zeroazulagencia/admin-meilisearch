-- Migracion: Agregar campos sigha y firmante a modulos_lucas_9_config
-- Version: v2.0

USE admin_dworkers;

INSERT INTO modulos_lucas_9_config (config_key, config_value, is_encrypted, description) VALUES
('sigha_login_url',      'https://sigha.com.co/api/login/',                    FALSE, 'URL de autenticacion en sigha.com.co'),
('sigha_empleados_url',  'https://sigha.com.co/api/ogh/empleados/',            FALSE, 'URL de consulta de empleados en sigha.com.co'),
('sigha_email',          'juandavid@autolarte.com.co',                         FALSE, 'Email de acceso a sigha.com.co'),
('sigha_clave',          'joGyguSpBCtSVla',                                    TRUE,  'Clave de acceso a sigha.com.co'),
('sigha_nit_cliente',    '890900081',                                          FALSE, 'NIT del cliente en sigha.com.co'),
('firma_imagen_url',     'https://workers.zeroazul.com/dev/autolarte/firma.jpeg', FALSE, 'URL de la imagen de firma'),
('logo_path',            'public-img/logo-autolarte.png',                      FALSE, 'Ruta del logo en el servidor')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

UPDATE modulos_lucas_9_config SET config_value = '890.900.081'       WHERE config_key = 'empresa_nit';
UPDATE modulos_lucas_9_config SET config_value = 'Medellin'          WHERE config_key = 'empresa_ciudad';
UPDATE modulos_lucas_9_config SET config_value = 'Martha Balbin Vasquez' WHERE config_key = 'firma_nombre';
UPDATE modulos_lucas_9_config SET config_value = 'Gerente Desarrollo Organizacional' WHERE config_key = 'firma_cargo';

SELECT config_key, config_value, is_encrypted FROM modulos_lucas_9_config ORDER BY id;

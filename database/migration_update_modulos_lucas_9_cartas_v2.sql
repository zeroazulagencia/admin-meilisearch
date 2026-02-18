-- Agregar columnas para tokens de PDF con tiempo limitado
-- y nombre de archivo unico por generacion (cada carta genera un PDF distinto)
ALTER TABLE modulos_lucas_9_cartas
  ADD COLUMN pdf_token VARCHAR(64) NULL AFTER updated_at,
  ADD COLUMN pdf_token_expires_at DATETIME NULL AFTER pdf_token,
  ADD COLUMN pdf_filename VARCHAR(255) NULL AFTER pdf_token_expires_at;

ALTER TABLE modulos_lucas_9_cartas ADD INDEX idx_pdf_token (pdf_token);

-- API key para proteger el endpoint /generar
INSERT INTO modulos_lucas_9_config (config_key, config_value)
VALUES ('api_key', 'cl_lc9_a68d984279e4410c8a049797060e4399d6cc5ce8');

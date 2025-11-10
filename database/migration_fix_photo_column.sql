-- Migración para cambiar la columna photo de VARCHAR(500) a TEXT
-- Esto permite almacenar imágenes en base64 que pueden ser más largas

ALTER TABLE agents MODIFY COLUMN photo TEXT;


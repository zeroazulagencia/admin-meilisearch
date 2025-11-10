-- Migración para cambiar la columna photo de VARCHAR(500) a MEDIUMTEXT
-- Esto permite almacenar imágenes en base64 que pueden ser más largas
-- MEDIUMTEXT puede almacenar hasta 16MB (16,777,215 bytes)

ALTER TABLE agents MODIFY COLUMN photo MEDIUMTEXT;


-- Agrega payload_raw para guardar el webhook recibido
ALTER TABLE modulos_biury_8_logs
  ADD COLUMN payload_raw LONGTEXT NULL AFTER total;

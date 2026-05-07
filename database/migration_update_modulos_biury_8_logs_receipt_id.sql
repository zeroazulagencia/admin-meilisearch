-- Agrega receipt_document_id para el recibo de caja
ALTER TABLE modulos_biury_8_logs
  ADD COLUMN receipt_document_id VARCHAR(50) NULL AFTER siigo_response;

-- Añadir columna form_variant para variantes de formulario (Formulario proyecto, Interes crédito, etc.)
USE admin_dworkers;
ALTER TABLE modulos_suvi_6_opportunities
  ADD COLUMN form_variant VARCHAR(100) NULL COMMENT 'Variante del formulario: Formulario proyecto, Interes crédito, etc.' AFTER nombre_proyecto;

-- En producción: si el registro 7 ya existe y es variante "Interes crédito", actualizar:
-- UPDATE modulos_suvi_6_opportunities SET form_variant = 'Interes crédito', pais = 'Estados Unidos (+1)', ciudad = 'Framingham' WHERE id = 7;

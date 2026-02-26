-- Asegurar que el módulo 6 cargue la carpeta suvi-opportunity
USE admin_dworkers;
UPDATE modules SET folder_name = 'suvi-opportunity' WHERE id = 6;

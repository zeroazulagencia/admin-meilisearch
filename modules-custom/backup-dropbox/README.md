# Módulo 7 - Backup BD a Dropbox

Copia diaria de la base de datos a medianoche (mysqldump) y subida a una carpeta de Dropbox. En `/modulos/7` se muestra el log de sincronizaciones.

## Estructura

- `modules-custom/backup-dropbox/index.tsx` — UI: log de sincronizaciones + configuración (token Dropbox, cron secret).
- `app/api/custom-module7/backup-dropbox/route.ts` — GET: listado del log.
- `app/api/custom-module7/backup-dropbox/run/route.ts` — POST: ejecutar backup (uso del cron).
- `app/api/custom-module7/backup-dropbox/config/route.ts` — GET/PUT: config (token enmascarado).
- `utils/modulos/backup-dropbox/config.ts` — Lectura/escritura de `modulos_backup_7_config`.
- `utils/modulos/backup-dropbox/run-backup.ts` — mysqldump, subida a Dropbox, registro en `modulos_backup_7_sync_log`.

## Base de datos

1. Ejecutar migración:
   ```bash
   mysql -u USUARIO -p admin_dworkers < database/migration_create_modulos_backup_7.sql
   ```
2. Asegurar que el módulo 7 use esta carpeta:
   ```sql
   UPDATE modules SET folder_name = 'backup-dropbox' WHERE id = 7;
   ```

## Configuración (UI o API)

En **https://workers.zeroazul.com/modulos/7** > **Configuración**:

- **Dropbox Access Token**: token de acceso de Dropbox (App Console > Generate access token o OAuth).
- **Carpeta Dropbox**: ruta dentro de la cuenta, ej. `/Aplicaciones/Zero Azul WORKERS`.
- **Cron secret**: opcional; si se define, el endpoint `POST .../run` debe recibir `?token=SECRET` o `?cron_secret=SECRET`.

## Cron (medianoche todos los días)

En el servidor donde corre la app, configurar crontab para llamar al endpoint una vez al día a las 00:00 (ej. America/Bogota):

```bash
0 0 * * * curl -s -X POST "https://workers.zeroazul.com/api/custom-module7/backup-dropbox/run?token=TU_CRON_SECRET"
```

Si no configuraste `cron_secret`, puedes dejar la URL sin `?token=...` (el endpoint permitirá la llamada). Se recomienda definir un secreto y usarlo en el cron.

## APIs

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/custom-module7/backup-dropbox` | Lista el log de sincronizaciones (`?limit=50`). |
| POST | `/api/custom-module7/backup-dropbox/run` | Ejecuta backup ahora. Query: `token` o `cron_secret`. |
| GET | `/api/custom-module7/backup-dropbox/config` | Config con token enmascarado. |
| PUT | `/api/custom-module7/backup-dropbox/config` | Actualizar `dropbox_access_token`, `dropbox_folder_path`, `cron_secret`. |

## Tablas

- **modulos_backup_7_config**: `dropbox_access_token`, `dropbox_folder_path`, `cron_secret`.
- **modulos_backup_7_sync_log**: `id`, `started_at`, `finished_at`, `status` (running|ok|error), `file_name`, `dropbox_path`, `bytes_size`, `error_message`.

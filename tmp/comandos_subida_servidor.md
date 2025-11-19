# Comandos para Subir Cambios al Servidor - v24.0

## ⚠️ IMPORTANTE: Proceso Seguro para Base de Datos

## Paso 1: Preparar cambios localmente (OPCIONAL - solo si usas git)

Si prefieres usar git (recomendado según README):
```bash
cd /Users/admin/Desktop/dev/admin-dworkers
git add .
git commit -m "v24.0: Eliminado tab Administración General, agregado tab Conexiones BD con DataTables de n8n"
git push origin master
```

## Paso 2: Conectar al Servidor y Actualizar Código

```bash
# Conectar al servidor
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45

# Ir al directorio del proyecto
cd /home/bitnami/admin-meilisearch

# Si usaste git, hacer pull:
git pull origin master

# Si NO usaste git, subir archivos manualmente con SCP (ver Paso 2B)

# Instalar dependencias (por si hay nuevas)
npm install

# Construir la aplicación
npm run build

# Reiniciar la aplicación
pm2 restart admin-meilisearch

# Verificar que esté corriendo
pm2 status
pm2 logs admin-meilisearch --lines 50
```

## Paso 2B: Subir archivos manualmente (si NO usas git)

Desde tu máquina local, ejecutar estos comandos para subir los archivos modificados:

```bash
# Subir archivos modificados
scp -i /Users/admin/Desktop/zero.pem app/admin-conocimiento/page.tsx bitnami@34.230.189.45:/home/bitnami/admin-meilisearch/app/admin-conocimiento/
scp -i /Users/admin/Desktop/zero.pem app/agentes/\[id\]/editar/page.tsx bitnami@34.230.189.45:/home/bitnami/admin-meilisearch/app/agentes/[id]/editar/
scp -i /Users/admin/Desktop/zero.pem app/api/agents/\[id\]/route.ts bitnami@34.230.189.45:/home/bitnami/admin-meilisearch/app/api/agents/[id]/
scp -i /Users/admin/Desktop/zero.pem app/api/agents/route.ts bitnami@34.230.189.45:/home/bitnami/admin-meilisearch/app/api/agents/
scp -i /Users/admin/Desktop/zero.pem utils/n8n.ts bitnami@34.230.189.45:/home/bitnami/admin-meilisearch/utils/

# Subir nueva migración
scp -i /Users/admin/Desktop/zero.pem database/migration_add_n8n_data_table_id.sql bitnami@34.230.189.45:/home/bitnami/admin-meilisearch/database/
```

Luego en el servidor:
```bash
cd /home/bitnami/admin-meilisearch
npm install
npm run build
pm2 restart admin-meilisearch
```

## Paso 3: Ejecutar Migración de Base de Datos (MUY IMPORTANTE - HACER CON CUIDADO)

⚠️ **EJECUTAR SOLO UNA VEZ Y CON MUCHO CUIDADO**

```bash
# Conectar al servidor (si no estás conectado)
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45

# Acceder a MySQL
mysql -u root -p

# En MySQL, ejecutar:
USE admin_dworkers;

# Verificar estructura actual ANTES de la migración (OPCIONAL pero recomendado)
DESCRIBE agents;

# Ejecutar la migración (ES SEGURA - solo agrega columna si no existe)
source /home/bitnami/admin-meilisearch/database/migration_add_n8n_data_table_id.sql;

# Verificar que la columna fue agregada correctamente
DESCRIBE agents;
# Deberías ver la columna 'n8n_data_table_id' al final

# Salir de MySQL
exit;
```

## Paso 4: Verificar que Todo Funcione

```bash
# Ver logs de la aplicación
pm2 logs admin-meilisearch --lines 100

# Verificar estado
pm2 status

# Si hay errores, revisar:
pm2 logs admin-meilisearch --err --lines 50
```

## Archivos Modificados en esta Versión (v24.0):

1. ✅ `app/admin-conocimiento/page.tsx` - Eliminado tab Administración General
2. ✅ `app/agentes/[id]/editar/page.tsx` - Agregado tab Conexiones BD
3. ✅ `utils/n8n.ts` - Agregada función getDataTables()
4. ✅ `app/api/agents/[id]/route.ts` - Actualizado para manejar n8n_data_table_id
5. ✅ `app/api/agents/route.ts` - Actualizado para incluir n8n_data_table_id
6. ✅ `database/migration_add_n8n_data_table_id.sql` - Nueva migración segura

## Notas Importantes:

- ⚠️ La migración de BD es SEGURA: solo agrega la columna si no existe, NO modifica datos existentes
- ⚠️ NO ejecutar la migración dos veces (aunque es segura, no es necesario)
- ⚠️ El archivo .env NO se toca, se mantiene como está en el servidor
- ✅ Todos los cambios son compatibles con datos existentes




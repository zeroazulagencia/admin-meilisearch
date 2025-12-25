# Guía de Despliegue - Admin Meilisearch

## Configuración del Servidor (AWS Lightsail)

### 1. Conectar al servidor
```bash
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45
```

### 2. Instalar Node.js y Git
```bash
# Actualizar el sistema
sudo apt update

# Instalar Node.js (si no está instalado)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Git (si no está instalado)
sudo apt-get install -y git

# Instalar PM2 globalmente
sudo npm install -g pm2
```

### 3. Clonar el repositorio
```bash
cd /home/bitnami
git clone https://github.com/zeroazulagencia/admin-meilisearch.git
cd admin-meilisearch
```

### 4. Instalar dependencias
```bash
npm install
```

### 5. Configurar variables de entorno
```bash
# Crear archivo .env
nano .env
```

Agregar:
```
OPENAI_API_KEY=tu-api-key-aqui
ENCRYPTION_KEY=tu_clave_secreta_de_al_menos_32_caracteres_aqui
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=tu_contraseña_mysql
MYSQL_DATABASE=admin_dworkers
MEILISEARCH_URL=https://server-search.zeroazul.com/
MEILISEARCH_API_KEY=tu_api_key_meilisearch
N8N_URL=https://automation.zeroazul.com/
N8N_API_KEY=tu_api_key_n8n
ALEGRA_EMAIL=tu-email-alegra@ejemplo.com
ALEGRA_API_TOKEN=tu_token_alegra_aqui
STRIPE_SECRET_KEY=tu_stripe_secret_key_aqui
```

**⚠️ CRÍTICO - ENCRYPTION_KEY:**
- Esta variable es **OBLIGATORIA** para encriptar/desencriptar tokens de WhatsApp
- Debe ser una clave **fija y persistente** (mínimo 32 caracteres)
- **NUNCA cambiar** esta clave una vez que los tokens estén encriptados
- Si cambias la clave, todos los tokens encriptados se corromperán
- Generar una clave segura: `openssl rand -hex 32`
- **Verificar antes de cada deploy**: `bash scripts/check-encryption-key.sh`

**⚠️ PROTECCIÓN DE DATOS WHATSAPP:**
- Los datos de WhatsApp Business API están protegidos por múltiples capas de seguridad
- El sistema NO actualizará campos de WhatsApp si no se envían explícitamente en el request
- Si los campos existen en la BD pero NO se envían en el request, se preservan automáticamente
- Siempre ejecutar `bash scripts/verify-whatsapp-data.sh` antes de cada deploy

### 6. Construir la aplicación
```bash
npm run build
```

### 7. Iniciar con PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8. Configurar Nginx (opcional, si quieres usar dominio)
```bash
sudo nano /etc/nginx/sites-available/admin-meilisearch
```

Agregar:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:8989;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar:
```bash
sudo ln -s /etc/nginx/sites-available/admin-meilisearch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Verificaciones Pre-Deploy

**⚠️ CRÍTICO: Ejecutar estas verificaciones ANTES de cada deploy para prevenir pérdida de datos**

### 1. Verificar Datos de WhatsApp

Antes de hacer deploy, ejecuta el script de verificación:

```bash
# En el servidor
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45
cd /home/bitnami/admin-meilisearch
bash scripts/verify-whatsapp-data.sh
```

Este script verifica:
- ✅ Que `ENCRYPTION_KEY` está configurada en `.env`
- ✅ Que las columnas de WhatsApp existen en la tabla `agents`
- ✅ Muestra un resumen de agentes con datos de WhatsApp configurados
- ❌ Falla si detecta problemas críticos

**Si el script falla, NO continuar con el deploy hasta corregir los problemas.**

### 2. Verificar ENCRYPTION_KEY

```bash
# En el servidor
bash scripts/check-encryption-key.sh
```

### 3. Checklist Pre-Deploy

Antes de cada deploy, verificar:

- [ ] `ENCRYPTION_KEY` está configurada en `.env` (mínimo 32 caracteres)
- [ ] Las columnas de WhatsApp existen en la tabla `agents`
- [ ] El script `verify-whatsapp-data.sh` pasa sin errores
- [ ] No hay tokens corruptos en la base de datos
- [ ] Se tiene backup de la base de datos (recomendado)

### 4. Advertencias Importantes

**⚠️ NUNCA ejecutar `database/schema.sql` en producción** si ya hay datos. Este archivo es solo para referencia y podría causar pérdida de datos.

**⚠️ NUNCA cambiar `ENCRYPTION_KEY`** una vez que los tokens estén encriptados. Si cambias la clave, todos los tokens se corromperán.

**⚠️ Siempre ejecutar el script de verificación** antes de hacer deploy para asegurar que los datos están intactos.

## Actualización del Código

### Desde tu máquina local:

1. Hacer cambios en el código
2. Commit y push:
```bash
git add .
git commit -m "Descripción de los cambios"
git push origin master
```

### En el servidor:

**PASO 1: Verificaciones Pre-Deploy (OBLIGATORIO)**

```bash
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45
cd /home/bitnami/admin-meilisearch

# Ejecutar script de verificación
bash scripts/verify-whatsapp-data.sh

# Si el script falla, NO continuar. Corregir problemas primero.
```

**PASO 2: Actualizar código**

```bash
git pull origin master
npm install
npm run build
```

**PASO 3: Reiniciar aplicación**

```bash
pm2 restart admin-meilisearch --update-env
```

**PASO 4: Verificar que todo funciona**

```bash
# Ver logs para verificar que no hay errores
pm2 logs admin-meilisearch --lines 50

# Verificar estado
pm2 status
```

## Acceso

- URL: http://34.230.189.45:8989
- O si configuraste Nginx: http://tu-dominio.com

## Comandos Útiles

```bash
# Ver logs
pm2 logs admin-meilisearch

# Ver estado
pm2 status

# Reiniciar
pm2 restart admin-meilisearch --update-env

# Detener
pm2 stop admin-meilisearch

# Ver monitoreo
pm2 monit

# Verificar datos de WhatsApp (ANTES de cada deploy)
bash scripts/verify-whatsapp-data.sh

# Verificar ENCRYPTION_KEY
bash scripts/check-encryption-key.sh
```

## Troubleshooting

### Problema: Los datos de WhatsApp se borran después del deploy

**Causas posibles:**
1. `ENCRYPTION_KEY` no está configurada o cambió
2. Las columnas de WhatsApp no existen en la tabla `agents`
3. Se ejecutó `schema.sql` por error en producción

**Solución:**
1. Ejecutar `bash scripts/verify-whatsapp-data.sh` para diagnosticar
2. Verificar que `ENCRYPTION_KEY` está configurada: `bash scripts/check-encryption-key.sh`
3. Si faltan columnas, ejecutar migración: `database/migration_add_whatsapp_fields.sql`
4. **NUNCA ejecutar `schema.sql` en producción** si ya hay datos

### Problema: Error "ENCRYPTION_KEY no configurada"

**Solución:**
1. Agregar `ENCRYPTION_KEY` al archivo `.env` en el servidor
2. Generar una clave segura: `openssl rand -hex 32`
3. Si ya tienes tokens encriptados, usar la clave original (NO generar una nueva)
4. Reiniciar la aplicación: `pm2 restart admin-meilisearch --update-env`


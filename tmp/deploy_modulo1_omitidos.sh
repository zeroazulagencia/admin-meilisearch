#!/bin/bash
# Despliegue de cambios módulo 1 (leads omitidos -> Google Sheet)
# Ejecutar desde tu Mac, en la raíz del proyecto admin-meilisearch:
#   chmod +x tmp/deploy_modulo1_omitidos.sh
#   ./tmp/deploy_modulo1_omitidos.sh

KEY="${1:-/Users/admin/Documents/keys/zero.pem}"
HOST="root@89.167.79.168"
REMOTE_BASE="${2:-/var/www/workers.zeroazul.com}"
# Uso: ./tmp/deploy_modulo1_omitidos.sh [ruta_key] [ruta_proyecto_remoto]

if [ ! -f "$KEY" ]; then
  echo "Error: Clave no encontrada en $KEY"
  echo "Uso: ./tmp/deploy_modulo1_omitidos.sh /ruta/a/zero.pem [/ruta/proyecto/remoto]"
  exit 1
fi

set -e

echo "=== Copiando archivos al servidor ($REMOTE_BASE) ==="

scp -i "$KEY" -o StrictHostKeyChecking=no utils/modulos/suvi-leads/module1-webhook-omitidos.ts $HOST:$REMOTE_BASE/utils/modulos/suvi-leads/

scp -i "$KEY" -o StrictHostKeyChecking=no utils/modulos/suvi-leads/module1-orchestrator.ts $HOST:$REMOTE_BASE/utils/modulos/suvi-leads/

scp -i "$KEY" -o StrictHostKeyChecking=no app/api/custom-module1/log-leads-suvi/process-salesforce/route.ts $HOST:$REMOTE_BASE/app/api/custom-module1/log-leads-suvi/process-salesforce/

scp -i "$KEY" -o StrictHostKeyChecking=no modules-custom/log-leads-suvi/index.tsx $HOST:$REMOTE_BASE/modules-custom/log-leads-suvi/

scp -i "$KEY" -o StrictHostKeyChecking=no settings.json $HOST:$REMOTE_BASE/

echo "=== Build y reinicio en servidor ==="

ssh -i "$KEY" -o StrictHostKeyChecking=no $HOST "cd $REMOTE_BASE && npm run build && (pm2 restart all 2>/dev/null || systemctl restart workers 2>/dev/null || echo 'Reinicia manualmente')"

echo "=== Despliegue completado. Revisa https://workers.zeroazul.com/modulos/1 ==="

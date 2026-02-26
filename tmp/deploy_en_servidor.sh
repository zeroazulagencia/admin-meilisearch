#!/bin/bash
# Ejecutar DENTRO del servidor (cuando ya estás conectado por SSH)
# Uso: cd ~/admin-meilisearch && ./tmp/deploy_en_servidor.sh

set -e
cd "$(dirname "$0")/.."

echo "=== Build ==="
npm run build

echo "=== Reiniciando aplicación ==="
pm2 restart all 2>/dev/null || systemctl restart workers 2>/dev/null || echo "Reinicia manualmente el proceso"

echo "=== Listo ==="

#!/usr/bin/env bash
# Túnel SSH: puerto local 3307 -> MySQL (3306) en servidor Bitnami.
# Requiere: tener acceso SSH al servidor (puerto 22).
# Uso: ./scripts/tunnel-mysql.sh   (deja el túnel en primer plano; Ctrl+C para cerrar)
# Para dejar en segundo plano: ./scripts/tunnel-mysql.sh -f

set -e
KEY="${KEY:-/Users/admin/Documents/keys/zero.pem}"
HOST="${TUNNEL_HOST:-34.230.189.45}"
USER="${TUNNEL_USER:-bitnami}"
LOCAL_PORT="${MYSQL_LOCAL_PORT:-3307}"
REMOTE_PORT="${MYSQL_REMOTE_PORT:-3306}"

if [[ ! -f "$KEY" ]]; then
  echo "Error: clave SSH no encontrada: $KEY"
  echo "Exporta KEY=... si está en otra ruta."
  exit 1
fi

if lsof -i :"$LOCAL_PORT" >/dev/null 2>&1; then
  echo "El puerto $LOCAL_PORT ya está en uso (túnel posiblemente activo)."
  echo "Si quieres reiniciar, cierra el proceso que usa ese puerto."
  exit 0
fi

echo "Abriendo túnel: 127.0.0.1:$LOCAL_PORT -> $USER@$HOST:mysql ($REMOTE_PORT)"
echo "Cierra con Ctrl+C. Con .env usando MYSQL_HOST=127.0.0.1 MYSQL_PORT=$LOCAL_PORT la app podrá conectar."
echo ""

exec ssh -i "$KEY" \
  -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
  -o ServerAliveInterval=60 \
  -o ServerAliveCountMax=3 \
  -o StrictHostKeyChecking=accept-new \
  "${USER}@${HOST}" \
  -N "$@"

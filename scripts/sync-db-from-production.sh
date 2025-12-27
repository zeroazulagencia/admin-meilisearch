#!/bin/bash

# Script para sincronizar la base de datos de producción con local
# Este script:
# 1. Se conecta al servidor remoto
# 2. Exporta la base de datos de producción
# 3. Descarga el dump a local
# 4. Hace backup de la BD local
# 5. Importa el dump en la BD local
#
# Uso: ./scripts/sync-db-from-production.sh

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ADVERTENCIA: $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Asegúrate de ejecutar este script desde la raíz del proyecto."
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Sincronización de Base de Datos: Producción → Local"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Configuración del servidor remoto
SSH_KEY="/Users/admin/Documents/keys/zero.pem"
SSH_USER="bitnami"
SSH_HOST="34.230.189.45"
REMOTE_PROJECT_PATH="/home/bitnami/admin-meilisearch"
DUMP_FILE="production_dump_$(date +%Y%m%d_%H%M%S).sql"
LOCAL_DUMP_PATH="tmp/${DUMP_FILE}"

# Verificar que existe la clave SSH
if [ ! -f "$SSH_KEY" ]; then
    print_error "No se encontró la clave SSH en: $SSH_KEY"
    exit 1
fi
print_success "Clave SSH encontrada"

# Verificar que existe el directorio tmp
if [ ! -d "tmp" ]; then
    mkdir -p tmp
    print_info "Directorio tmp creado"
fi

# 1. Leer variables de entorno locales
print_info "Leyendo configuración local..."
if [ ! -f ".env" ]; then
    print_error "No se encontró el archivo .env local"
    print_info "Crea el archivo .env con las variables de entorno necesarias"
    exit 1
fi

MYSQL_HOST_LOCAL=$(grep "^MYSQL_HOST=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "localhost")
MYSQL_USER_LOCAL=$(grep "^MYSQL_USER=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "root")
MYSQL_PASSWORD_LOCAL=$(grep "^MYSQL_PASSWORD=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
MYSQL_DATABASE_LOCAL=$(grep "^MYSQL_DATABASE=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "admin_dworkers")

if [ -z "$MYSQL_PASSWORD_LOCAL" ]; then
    print_warning "MYSQL_PASSWORD_LOCAL no está configurada en .env local"
fi

# 2. Conectar al servidor y leer variables de entorno remotas
print_info "Conectando al servidor remoto..."
print_info "Leyendo configuración de producción..."

REMOTE_ENV=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" "cat $REMOTE_PROJECT_PATH/.env" 2>/dev/null || echo "")

if [ -z "$REMOTE_ENV" ]; then
    print_error "No se pudo leer el archivo .env del servidor remoto"
    exit 1
fi

MYSQL_HOST_REMOTE=$(echo "$REMOTE_ENV" | grep "^MYSQL_HOST=" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "localhost")
MYSQL_USER_REMOTE=$(echo "$REMOTE_ENV" | grep "^MYSQL_USER=" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "root")
MYSQL_PASSWORD_REMOTE=$(echo "$REMOTE_ENV" | grep "^MYSQL_PASSWORD=" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
MYSQL_DATABASE_REMOTE=$(echo "$REMOTE_ENV" | grep "^MYSQL_DATABASE=" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "admin_dworkers")

print_success "Configuración leída del servidor remoto"
print_info "  Base de datos remota: ${MYSQL_DATABASE_REMOTE}"
print_info "  Base de datos local: ${MYSQL_DATABASE_LOCAL}"

# 3. Exportar base de datos del servidor remoto
print_info "Exportando base de datos de producción..."

EXPORT_CMD="mysqldump -h${MYSQL_HOST_REMOTE} -u${MYSQL_USER_REMOTE}"
if [ -n "$MYSQL_PASSWORD_REMOTE" ]; then
    EXPORT_CMD="${EXPORT_CMD} -p${MYSQL_PASSWORD_REMOTE}"
fi
EXPORT_CMD="${EXPORT_CMD} ${MYSQL_DATABASE_REMOTE} > ${REMOTE_PROJECT_PATH}/tmp/${DUMP_FILE}"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" "cd $REMOTE_PROJECT_PATH && mkdir -p tmp && $EXPORT_CMD" 2>/dev/null

if [ $? -ne 0 ]; then
    print_error "Error al exportar la base de datos del servidor remoto"
    exit 1
fi

print_success "Base de datos exportada en el servidor remoto"

# 4. Descargar el dump
print_info "Descargando dump desde el servidor..."

scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST:$REMOTE_PROJECT_PATH/tmp/$DUMP_FILE" "$LOCAL_DUMP_PATH" 2>/dev/null

if [ $? -ne 0 ]; then
    print_error "Error al descargar el dump desde el servidor"
    exit 1
fi

print_success "Dump descargado: $LOCAL_DUMP_PATH"

# 5. Limpiar el dump del servidor remoto
print_info "Limpiando archivo temporal del servidor..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" "rm -f $REMOTE_PROJECT_PATH/tmp/$DUMP_FILE" 2>/dev/null

# 6. Hacer backup de la base de datos local
print_info "Haciendo backup de la base de datos local..."
BACKUP_FILE="tmp/local_backup_$(date +%Y%m%d_%H%M%S).sql"

MYSQL_CMD_LOCAL="mysql -h${MYSQL_HOST_LOCAL} -u${MYSQL_USER_LOCAL}"
if [ -n "$MYSQL_PASSWORD_LOCAL" ]; then
    MYSQL_CMD_LOCAL="${MYSQL_CMD_LOCAL} -p${MYSQL_PASSWORD_LOCAL}"
fi

# Verificar que la base de datos local existe
DB_EXISTS=$(echo "SHOW DATABASES LIKE '${MYSQL_DATABASE_LOCAL}';" | $MYSQL_CMD_LOCAL 2>/dev/null | grep -c "${MYSQL_DATABASE_LOCAL}" || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
    DUMP_CMD_LOCAL="mysqldump -h${MYSQL_HOST_LOCAL} -u${MYSQL_USER_LOCAL}"
    if [ -n "$MYSQL_PASSWORD_LOCAL" ]; then
        DUMP_CMD_LOCAL="${DUMP_CMD_LOCAL} -p${MYSQL_PASSWORD_LOCAL}"
    fi
    DUMP_CMD_LOCAL="${DUMP_CMD_LOCAL} ${MYSQL_DATABASE_LOCAL} > ${BACKUP_FILE}"
    
    eval "$DUMP_CMD_LOCAL" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Backup local creado: $BACKUP_FILE"
    else
        print_warning "No se pudo crear backup local (puede que la BD no exista aún)"
    fi
else
    print_info "La base de datos local no existe, se creará con el dump de producción"
fi

# 7. Crear la base de datos local si no existe
print_info "Verificando/Creando base de datos local..."
echo "CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE_LOCAL};" | $MYSQL_CMD_LOCAL 2>/dev/null || true

# 8. Importar el dump en la base de datos local
print_info "Importando dump en la base de datos local..."
print_warning "Esto reemplazará todos los datos locales con los datos de producción"

IMPORT_CMD="mysql -h${MYSQL_HOST_LOCAL} -u${MYSQL_USER_LOCAL}"
if [ -n "$MYSQL_PASSWORD_LOCAL" ]; then
    IMPORT_CMD="${IMPORT_CMD} -p${MYSQL_PASSWORD_LOCAL}"
fi
IMPORT_CMD="${IMPORT_CMD} ${MYSQL_DATABASE_LOCAL} < ${LOCAL_DUMP_PATH}"

eval "$IMPORT_CMD" 2>/dev/null

if [ $? -ne 0 ]; then
    print_error "Error al importar el dump en la base de datos local"
    print_info "El backup local está disponible en: $BACKUP_FILE"
    exit 1
fi

print_success "Dump importado correctamente en la base de datos local"

# 9. Verificar la importación
print_info "Verificando importación..."
TABLES_COUNT=$(echo "SHOW TABLES;" | $MYSQL_CMD_LOCAL ${MYSQL_DATABASE_LOCAL} 2>/dev/null | wc -l | tr -d ' ')

if [ "$TABLES_COUNT" -gt 0 ]; then
    print_success "Importación verificada: ${TABLES_COUNT} tabla(s) encontrada(s)"
else
    print_warning "No se encontraron tablas después de la importación"
fi

# 10. Limpiar archivos temporales (opcional)
echo ""
read -p "¿Deseas eliminar el archivo dump descargado? (s/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    rm -f "$LOCAL_DUMP_PATH"
    print_success "Archivo dump eliminado"
else
    print_info "Archivo dump conservado en: $LOCAL_DUMP_PATH"
fi

# Resumen final
echo ""
echo "════════════════════════════════════════════════════════════════"
print_success "Sincronización completada exitosamente"
echo ""
echo "  Resumen:"
echo "  ─────────────────────────────────────"
echo "  • Base de datos remota: ${MYSQL_DATABASE_REMOTE}"
echo "  • Base de datos local: ${MYSQL_DATABASE_LOCAL}"
echo "  • Dump descargado: ${LOCAL_DUMP_PATH}"
if [ -f "$BACKUP_FILE" ]; then
    echo "  • Backup local: ${BACKUP_FILE}"
fi
echo "  • Tablas importadas: ${TABLES_COUNT}"
echo ""
print_info "Tu base de datos local ahora tiene los mismos datos que producción"
echo ""


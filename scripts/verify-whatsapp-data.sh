#!/bin/bash

# Script de verificación de datos de WhatsApp antes de deploy
# Este script verifica que:
# 1. Los campos de WhatsApp existen en la tabla agents
# 2. ENCRYPTION_KEY está configurada en .env
# 3. Muestra un resumen de agentes con datos de WhatsApp configurados
#
# Uso: ./scripts/verify-whatsapp-data.sh
# O desde el servidor: bash scripts/verify-whatsapp-data.sh

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    echo -e "${NC}ℹ️  $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Asegúrate de ejecutar este script desde la raíz del proyecto."
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Verificación de Datos WhatsApp Business API"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 1. Verificar que .env existe
if [ ! -f ".env" ]; then
    print_error "No se encontró el archivo .env"
    print_info "Crea el archivo .env con las variables de entorno necesarias"
    exit 1
fi
print_success "Archivo .env encontrado"

# 2. Verificar ENCRYPTION_KEY
print_info "Verificando ENCRYPTION_KEY..."
ENCRYPTION_KEY=$(grep "^ENCRYPTION_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$ENCRYPTION_KEY" ] || [ "$ENCRYPTION_KEY" = "" ]; then
    print_error "ENCRYPTION_KEY no está configurada en .env"
    print_info "Agrega ENCRYPTION_KEY a tu archivo .env"
    print_info "Generar una clave segura: openssl rand -hex 32"
    exit 1
fi

if [ ${#ENCRYPTION_KEY} -lt 32 ]; then
    print_warning "ENCRYPTION_KEY es muy corta (${#ENCRYPTION_KEY} caracteres). Se recomienda mínimo 32 caracteres"
else
    print_success "ENCRYPTION_KEY configurada (${#ENCRYPTION_KEY} caracteres)"
fi

# 3. Verificar variables de MySQL
print_info "Verificando variables de MySQL..."
MYSQL_HOST=$(grep "^MYSQL_HOST=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "localhost")
MYSQL_USER=$(grep "^MYSQL_USER=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "root")
MYSQL_PASSWORD=$(grep "^MYSQL_PASSWORD=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
MYSQL_DATABASE=$(grep "^MYSQL_DATABASE=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "admin_dworkers")

if [ -z "$MYSQL_PASSWORD" ]; then
    print_warning "MYSQL_PASSWORD no está configurada"
else
    print_success "Variables de MySQL configuradas"
fi

# 4. Verificar conexión a MySQL y estructura de la tabla
print_info "Verificando estructura de la base de datos..."

# Intentar conectar a MySQL y verificar columnas
MYSQL_CMD="mysql -h${MYSQL_HOST} -u${MYSQL_USER}"

if [ -n "$MYSQL_PASSWORD" ]; then
    MYSQL_CMD="${MYSQL_CMD} -p${MYSQL_PASSWORD}"
fi

MYSQL_CMD="${MYSQL_CMD} ${MYSQL_DATABASE}"

# Verificar que la tabla agents existe
TABLE_EXISTS=$($MYSQL_CMD -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${MYSQL_DATABASE}' AND table_name = 'agents';" 2>/dev/null || echo "0")

if [ "$TABLE_EXISTS" = "0" ]; then
    print_error "La tabla 'agents' no existe en la base de datos '${MYSQL_DATABASE}'"
    exit 1
fi
print_success "Tabla 'agents' existe"

# Verificar columnas de WhatsApp
WHATSAPP_COLUMNS=(
    "whatsapp_business_account_id"
    "whatsapp_phone_number_id"
    "whatsapp_access_token"
    "whatsapp_webhook_verify_token"
    "whatsapp_app_secret"
)

MISSING_COLUMNS=()

for COLUMN in "${WHATSAPP_COLUMNS[@]}"; do
    COLUMN_EXISTS=$($MYSQL_CMD -se "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = '${MYSQL_DATABASE}' AND table_name = 'agents' AND column_name = '${COLUMN}';" 2>/dev/null || echo "0")
    
    if [ "$COLUMN_EXISTS" = "0" ]; then
        MISSING_COLUMNS+=("$COLUMN")
        print_warning "Columna '${COLUMN}' no existe en la tabla 'agents'"
    else
        print_success "Columna '${COLUMN}' existe"
    fi
done

if [ ${#MISSING_COLUMNS[@]} -gt 0 ]; then
    print_error "Faltan ${#MISSING_COLUMNS[@]} columnas de WhatsApp en la tabla 'agents'"
    print_info "Ejecuta la migración: database/migration_add_whatsapp_fields.sql"
    exit 1
fi

# 5. Contar agentes con datos de WhatsApp configurados
print_info "Analizando datos de agentes..."

TOTAL_AGENTS=$($MYSQL_CMD -se "SELECT COUNT(*) FROM agents;" 2>/dev/null || echo "0")

if [ "$TOTAL_AGENTS" = "0" ]; then
    print_warning "No hay agentes en la base de datos"
else
    print_success "Total de agentes: ${TOTAL_AGENTS}"
    
    # Contar agentes con business_account_id
    AGENTS_WITH_BUSINESS_ID=$($MYSQL_CMD -se "SELECT COUNT(*) FROM agents WHERE whatsapp_business_account_id IS NOT NULL AND whatsapp_business_account_id != '';" 2>/dev/null || echo "0")
    
    # Contar agentes con phone_number_id
    AGENTS_WITH_PHONE_ID=$($MYSQL_CMD -se "SELECT COUNT(*) FROM agents WHERE whatsapp_phone_number_id IS NOT NULL AND whatsapp_phone_number_id != '';" 2>/dev/null || echo "0")
    
    # Contar agentes con access_token (encriptado)
    AGENTS_WITH_TOKEN=$($MYSQL_CMD -se "SELECT COUNT(*) FROM agents WHERE whatsapp_access_token IS NOT NULL AND whatsapp_access_token != '';" 2>/dev/null || echo "0")
    
    echo ""
    echo "  Resumen de configuración WhatsApp:"
    echo "  ─────────────────────────────────────"
    echo "  • Agentes con Business Account ID: ${AGENTS_WITH_BUSINESS_ID}"
    echo "  • Agentes con Phone Number ID: ${AGENTS_WITH_PHONE_ID}"
    echo "  • Agentes con Access Token: ${AGENTS_WITH_TOKEN}"
    echo ""
    
    if [ "$AGENTS_WITH_TOKEN" -gt 0 ]; then
        print_success "Hay ${AGENTS_WITH_TOKEN} agente(s) con tokens de WhatsApp configurados"
    else
        print_warning "No hay agentes con tokens de WhatsApp configurados"
    fi
fi

# 6. Resumen final
echo ""
echo "════════════════════════════════════════════════════════════════"
if [ ${#MISSING_COLUMNS[@]} -eq 0 ] && [ -n "$ENCRYPTION_KEY" ] && [ ${#ENCRYPTION_KEY} -ge 32 ]; then
    print_success "Todas las verificaciones pasaron correctamente"
    echo ""
    print_info "El sistema está listo para deploy"
    exit 0
else
    print_error "Algunas verificaciones fallaron"
    echo ""
    print_info "Corrige los problemas antes de continuar con el deploy"
    exit 1
fi


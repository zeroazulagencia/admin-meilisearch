#!/bin/bash

# Script para verificar y configurar ENCRYPTION_KEY en el servidor
# Uso: ./scripts/check-encryption-key.sh

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║              Verificación de ENCRYPTION_KEY en el Servidor                 ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Verificar si existe .env
if [ ! -f .env ]; then
    echo "❌ ERROR: Archivo .env no encontrado"
    echo "   Creando archivo .env..."
    touch .env
fi

# Verificar si ENCRYPTION_KEY existe
if grep -q "^ENCRYPTION_KEY=" .env; then
    echo "✅ ENCRYPTION_KEY encontrada en .env"
    ENCRYPTION_KEY=$(grep "^ENCRYPTION_KEY=" .env | cut -d '=' -f2-)
    if [ -z "$ENCRYPTION_KEY" ] || [ ${#ENCRYPTION_KEY} -lt 32 ]; then
        echo "⚠️  ADVERTENCIA: ENCRYPTION_KEY está vacía o muy corta (mínimo 32 caracteres)"
        echo "   Longitud actual: ${#ENCRYPTION_KEY} caracteres"
    else
        echo "✅ ENCRYPTION_KEY configurada correctamente"
        echo "   Longitud: ${#ENCRYPTION_KEY} caracteres"
        echo "   Primeros 4 caracteres: ${ENCRYPTION_KEY:0:4}..."
    fi
else
    echo "❌ ERROR: ENCRYPTION_KEY no encontrada en .env"
    echo ""
    echo "Generando nueva clave de encriptación..."
    NEW_KEY=$(openssl rand -hex 32)
    echo "ENCRYPTION_KEY=$NEW_KEY" >> .env
    echo ""
    echo "✅ ENCRYPTION_KEY generada y agregada a .env"
    echo "   IMPORTANTE: Guarda esta clave de forma segura"
    echo "   Si ya tienes tokens encriptados, NO uses esta nueva clave"
    echo "   Usa la clave original con la que se encriptaron los tokens"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                              RECOMENDACIONES                                 ║"
echo "╠══════════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                              ║"
echo "║  1. ENCRYPTION_KEY debe ser una clave fija y persistente                     ║"
echo "║  2. NUNCA cambiar esta clave una vez que los tokens estén encriptados       ║"
echo "║  3. Si cambias la clave, todos los tokens se corromperán                     ║"
echo "║  4. Guarda esta clave de forma segura (password manager, etc.)               ║"
echo "║  5. Mínimo recomendado: 32 caracteres                                       ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"


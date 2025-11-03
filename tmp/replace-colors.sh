#!/bin/bash
# Script para reemplazar colores azules por #5DE1E5 en archivos TSX

FILES=(
  "app/clientes/[id]/editar/page.tsx"
  "app/agentes/[id]/editar/page.tsx"
  "app/dashboard/page.tsx"
  "app/ejecuciones/page.tsx"
  "app/conversaciones/page.tsx"
  "app/agentes/page.tsx"
  "app/admin-conocimiento/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Reemplazar bg-blue-600 por estilo con #5DE1E5
    # Reemplazar text-blue-600 por estilo con #5DE1E5
    # Reemplazar border-blue-600 por estilo con #5DE1E5
    # Reemplazar ring-blue-500 por ring-[#5DE1E5]
    # Reemplazar hover:bg-blue-700 por hover:opacity-90
    # Reemplazar text-blue por color personalizado
    # Esto es complejo, mejor hacerlo manualmente en los archivos clave
  fi
done


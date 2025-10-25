# Admin Meilisearch

Interfaz de administración moderna para Meilisearch desarrollada con Next.js, Tailwind CSS y Axios.

## Características

- **Selector de Índices**: Visualización y selección de todos los índices disponibles
- **Propiedades del Índice**: Información detallada del índice seleccionado
  - Campos filtrables, buscables y ordenables
  - Información de embeddings si está habilitado
  - Distribución de campos
- **CRUD de Documentos**: Crear, leer, actualizar y eliminar documentos
- **Buscador de Documentos**: Buscar documentos dentro del índice seleccionado
- **Editor Inteligente**: Detección automática del tipo de campo (string, html, array, object, number, boolean)

## Configuración

El proyecto está configurado para conectarse al servidor Meilisearch en:
- URL: `https://server-search.zeroazul.com/`
- API Key: Configurada en `utils/constants.ts`

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:8989](http://localhost:8989) en tu navegador.

## Estructura del Proyecto

```
├── app/
│   ├── page.tsx          # Página principal
│   ├── layout.tsx        # Layout raíz
│   └── globals.css       # Estilos globales
├── components/
│   ├── IndexSelector.tsx     # Selector de índices
│   ├── IndexProperties.tsx   # Propiedades del índice
│   ├── DocumentList.tsx      # Lista de documentos
│   └── DocumentEditor.tsx    # Editor de documentos
├── utils/
│   ├── meilisearch.ts        # API de Meilisearch
│   └── constants.ts          # Constantes del proyecto
└── settings.json              # Configuración del proyecto
```

## Despliegue

### Repositorio
- GitHub: https://github.com/zeroazulagencia/admin-meilisearch
- Servidor: AWS Lightsail (34.230.189.45)
- Ubicación: `/home/bitnami/admin-meilisearch`
- Puerto: 8988
- URL: http://34.230.189.45:8988

### Actualizar código desde local:

**1. Hacer cambios localmente y subir a GitHub:**
```bash
git add .
git commit -m "Descripción de los cambios"
git push origin master
```

**2. Desplegar en el servidor (TODO EN UNO):**
```bash
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45 "cd /home/bitnami/admin-meilisearch && git pull && npm run build && pm2 restart admin-meilisearch"
```

**3. O paso a paso:**
```bash
# Conectar al servidor
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45

# Navegar al proyecto
cd /home/bitnami/admin-meilisearch

# Descargar cambios
git pull origin master

# Instalar dependencias (si hay nuevas)
npm install

# Reconstruir aplicación
npm run build

# Reiniciar aplicación
pm2 restart admin-meilisearch

# Verificar estado
pm2 status
```

### Ver logs
```bash
# Logs en tiempo real
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45 "pm2 logs admin-meilisearch"

# Últimas 50 líneas
ssh -i /Users/admin/Desktop/zero.pem bitnami@34.230.189.45 "pm2 logs admin-meilisearch --lines 50 --nostream"
```

### Comandos PM2 útiles
```bash
pm2 status              # Ver estado de procesos
pm2 restart admin-meilisearch  # Reiniciar aplicación
pm2 stop admin-meilisearch     # Detener aplicación
pm2 start admin-meilisearch    # Iniciar aplicación
pm2 monit               # Monitor en tiempo real
pm2 save                # Guardar configuración
```

### Reinicio automático
La aplicación se configura para iniciar automáticamente después de un reinicio del servidor gracias a `pm2 save` y `pm2 startup`.

## Versión

v16.7

### Cambios recientes:
- ✨ Búsqueda manual: Solo el botón "Buscar" ejecuta búsquedas, sin disparos automáticos (v16.7)
- ✨ Spinner mejorado con texto "Buscando..." durante la búsqueda (v16.7)
- ✨ Soporte para búsqueda con tecla Enter (v16.7)
- 🔧 Corrección de búsqueda con IA que causaba errores al marcar checkbox (v16.6)
- 🔧 Corrección definitiva del contador de búsqueda usando parámetros correctos de Meilisearch (v16.5)
- 🔧 Corrección del contador de búsqueda que mostraba "NaN" (v16.4)
- ✨ Configuración de embeddings de IA desde la interfaz
- ✨ Búsqueda híbrida con IA (semántica + texto)
- ✨ Integración con n8n para visualizar ejecuciones
- ✨ Explicaciones con IA de errores y respuestas de n8n
- ✨ Despliegue automatizado con PM2
- ✨ Deploy en AWS Lightsail


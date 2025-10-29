# Admin Meilisearch - Panel de Administración

## Roadmap

- Ajustar permisos de clientes (granularidad y aplicación en rutas y vistas)
- Agregar funcionalidad de carga de PDF (ingesta y gestión de archivos)
- Ajustar plantilla y agregar diseño de landing al LOGIN

## 📋 Descripción General

**Admin Meilisearch** es una aplicación web moderna desarrollada en Next.js que proporciona una interfaz completa para administrar índices de Meilisearch. La aplicación permite gestionar documentos, configurar búsquedas híbridas con IA, visualizar propiedades de índices y ejecutar operaciones CRUD de manera intuitiva.

## 🚀 Características Principales

### 🔍 Gestión de Búsquedas
- **Búsqueda tradicional**: Búsqueda de texto completo con filtros avanzados
- **Búsqueda híbrida con IA**: Combina búsqueda semántica y textual usando embeddings
- **Detección automática de embedders**: Se adapta automáticamente a cualquier configuración de embedder
- **Threshold de relevancia**: Control de precisión de resultados (configurable)
- **Paginación inteligente**: Navegación optimizada entre resultados

### 📊 Administración de Índices
- **Visualización de propiedades**: Estadísticas completas del índice
- **Configuración de embeddings**: Gestión de modelos de IA
- **Campos buscables/filtrables**: Configuración de atributos
- **Panel colapsable**: Interfaz limpia y organizada

### 📝 Gestión de Documentos
- **CRUD completo**: Crear, leer, actualizar y eliminar documentos
- **Editor integrado**: Interfaz de edición JSON con validación
- **Selección múltiple**: Operaciones en lote
- **Vista previa**: Visualización estructurada de documentos

### 🔐 Autenticación y Seguridad
- **Sistema de login**: Autenticación con credenciales específicas
- **Sesión persistente**: Mantenimiento de sesión en navegador (24 horas)
- **Protección de rutas**: Acceso controlado a funcionalidades

## 🏗️ Arquitectura Técnica

### Frontend
- **Framework**: Next.js 14 con App Router
- **UI**: Tailwind CSS con componentes personalizados
- **Estado**: React Hooks (useState, useEffect)
- **Tipado**: TypeScript para mayor robustez

### Backend
- **API Routes**: Next.js API Routes como proxy
- **Cliente HTTP**: Axios para comunicación con servicios externos
- **Validación**: Validación de datos en tiempo real

### Servicios Externos
- **Meilisearch**: Motor de búsqueda principal
- **OpenAI**: Servicio de embeddings para búsqueda semántica
- **n8n**: Automatización de workflows (integración futura)

## 📡 Endpoints y APIs

### 🔗 Meilisearch API
**Base URL**: `https://server-search.zeroazul.com/`

#### Endpoints Principales:
- `GET /indexes` - Listar todos los índices
- `GET /indexes/{uid}` - Obtener información del índice
- `GET /indexes/{uid}/stats` - Estadísticas del índice
- `GET /indexes/{uid}/settings` - Configuración del índice
- `GET /indexes/{uid}/documents` - Listar documentos (con paginación)
- `POST /indexes/{uid}/search` - Búsqueda de documentos
- `POST /indexes/{uid}/documents` - Crear/actualizar documentos
- `DELETE /indexes/{uid}/documents/{id}` - Eliminar documento

#### Parámetros de Búsqueda:
```json
{
  "q": "término de búsqueda",
  "hitsPerPage": 20,
  "page": 1,
  "hybridEmbedder": "products-openai",
  "hybridSemanticRatio": 0.5,
  "matchingStrategy": "all",
  "rankingScoreThreshold": 0.1
}
```

### 🤖 OpenAI API
**Uso**: Generación de embeddings para búsqueda semántica
- **Modelo**: text-embedding-ada-002
- **Integración**: A través de Meilisearch embedders

### 🔄 n8n Integration
**Base URL**: `https://n8n.zeroazul.com/`
- `GET /executions` - Listar ejecuciones de workflows
- `POST /workflows/{id}/execute` - Ejecutar workflow
- `GET /workflows` - Listar workflows disponibles

## 🗂️ Estructura del Proyecto

```
admin-dworkers/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── meilisearch/         # Proxy a Meilisearch
│   │   ├── n8n/                 # Proxy a n8n
│   │   └── openai/              # Integración OpenAI
│   ├── admin-conocimiento/       # Panel de conocimiento
│   ├── ejecuciones/             # Panel de ejecuciones n8n
│   ├── globals.css              # Estilos globales
│   ├── layout.tsx               # Layout principal
│   └── page.tsx                 # Página principal
├── components/                   # Componentes React
│   ├── ui/                      # Componentes UI base
│   ├── AuthProvider.tsx         # Proveedor de autenticación
│   ├── DocumentEditor.tsx      # Editor de documentos
│   ├── DocumentList.tsx        # Lista de documentos
│   ├── IndexProperties.tsx     # Propiedades del índice
│   ├── IndexSelector.tsx       # Selector de índices
│   ├── LoginForm.tsx           # Formulario de login
│   └── Navbar.tsx              # Barra de navegación
├── utils/                       # Utilidades
│   ├── cn.ts                   # Clases CSS condicionales
│   ├── constants.ts            # Constantes de la aplicación
│   ├── meilisearch.ts         # Cliente Meilisearch
│   └── n8n.ts                 # Cliente n8n
├── tmp/                        # Archivos temporales
├── settings.json              # Configuración del proyecto
├── package.json               # Dependencias
├── tailwind.config.js        # Configuración Tailwind
├── tsconfig.json             # Configuración TypeScript
└── README.md                 # Documentación
```

## 🔧 Configuración y Variables

### Variables de Entorno
```env
# Meilisearch
MEILISEARCH_URL=https://server-search.zeroazul.com/
MEILISEARCH_API_KEY=tu_api_key_aqui

# OpenAI
OPENAI_API_KEY=tu_openai_key_aqui

# n8n
N8N_URL=https://n8n.zeroazul.com/
N8N_API_KEY=tu_n8n_key_aqui
```

### Configuración en settings.json
```json
{
  "proyecto": {
    "nombre": "Admin Meilisearch",
    "version": "v17.9",
    "modo": "local",
    "debug": true
  },
  "meilisearch": {
    "url": "https://server-search.zeroazul.com/",
    "apiKey": "tu_api_key"
  },
  "openai": {
    "apiKey": "tu_openai_key"
  },
  "n8n": {
    "url": "https://n8n.zeroazul.com/",
    "apiKey": "tu_n8n_key"
  }
}
```

## 🚀 Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Acceso a servicios Meilisearch, OpenAI y n8n

### Instalación
```bash
# Clonar repositorio
git clone [url-del-repositorio]
cd admin-dworkers

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev
```

### Scripts Disponibles
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linter
npm run type-check   # Verificación de tipos
```

## 🌐 Despliegue

### Servidor de Producción
- **URL**: http://34.230.189.45:8988/
- **Gestión de procesos**: PM2
- **Reinicio automático**: Configurado con PM2

### Comandos de Despliegue
```bash
# Construir aplicación
npm run build

# Iniciar con PM2
pm2 start ecosystem.config.js

# Guardar configuración PM2
pm2 save

# Configurar inicio automático
pm2 startup
```

## 📊 Flujo de Datos

### 1. Autenticación
```
Usuario → LoginForm → AuthProvider → localStorage → Sesión persistente
```

### 2. Selección de Índice
```
IndexSelector → Meilisearch API → Lista de índices → DocumentList
```

### 3. Búsqueda de Documentos
```
DocumentList → API Route → Meilisearch → Resultados → Paginación
```

### 4. Búsqueda con IA
```
DocumentList → OpenAI Embeddings → Meilisearch Hybrid Search → Resultados filtrados
```

### 5. Gestión de Documentos
```
DocumentEditor → API Route → Meilisearch CRUD → Actualización en tiempo real
```

## 🔒 Seguridad

### Autenticación
- **Usuario**: zeroazul
- **Clave**: 43r1tnd*.*V1nc3nt+
- **Expiración**: 24 horas
- **Almacenamiento**: localStorage (cliente)

### Validación
- Validación de entrada en todos los formularios
- Sanitización de datos antes de envío
- Manejo seguro de errores de API

## 🎯 Casos de Uso

### Para Administradores
- Configurar índices de búsqueda
- Gestionar documentos en masa
- Monitorear estadísticas de uso
- Configurar embeddings de IA

### Para Desarrolladores
- Probar búsquedas antes de implementar
- Validar configuración de índices
- Debug de problemas de búsqueda
- Integración con APIs externas

### Para Usuarios Finales
- Búsqueda avanzada con IA
- Exploración de contenido
- Acceso rápido a información relevante

## 🔄 Integración con Servicios

### Meilisearch
- **Propósito**: Motor de búsqueda principal
- **Funciones**: Indexación, búsqueda, filtrado, ranking
- **Configuración**: Embedders, campos, reglas de ranking

### OpenAI
- **Propósito**: Generación de embeddings semánticos
- **Modelo**: text-embedding-ada-002
- **Uso**: Búsqueda híbrida semántica + textual

### n8n
- **Propósito**: Automatización de workflows
- **Funciones**: Ejecución de procesos, integración de datos
- **Estado**: Integración en desarrollo

## 📈 Métricas y Monitoreo

### Estadísticas Disponibles
- Número de documentos por índice
- Tamaño de base de datos
- Estado de indexación
- Tiempo de procesamiento de búsquedas
- Número de embeddings generados

### Logs y Debug
- Logs detallados de búsquedas
- Información de errores de API
- Métricas de rendimiento
- Debug de configuración de embedders

## 🛠️ Mantenimiento

### Actualizaciones Regulares
- Actualización de dependencias
- Mejoras de seguridad
- Optimizaciones de rendimiento
- Nuevas funcionalidades

### Backup y Recuperación
- Backup automático de configuraciones
- Recuperación de datos de índices
- Restauración de configuraciones de embedders

## 📞 Soporte y Contacto

### Documentación
- README actualizado con cada versión
- Changelog detallado de cambios
- Guías de configuración

### Desarrollo
- Código modular y documentado
- Componentes reutilizables
- Arquitectura escalable

---

## Versión

v18.0

### Cambios recientes:
- 📚 Documentación completa renovada - README detallado con arquitectura, endpoints y casos de uso (v18.0)
- 🎯 Threshold ajustado a 0.1 - ahora muestra más resultados en búsquedas con IA (v17.9)
- 🎨 Interfaz más limpia - removido icono de ayuda de "Buscar con IA" (v17.8)
- 🔍 Detección automática del nombre del embedder - ahora funciona con cualquier nombre de embedder configurado (v17.7)
- 🎯 Umbral de relevancia mejorado para IA - valor por defecto 0.3 para resultados más precisos (v17.6)
- ⏱️ Spinner mínimo reducido a 1.5 segundos y mejorado con icono visual (v17.6)
- 🔄 Mejora en lógica de paginación - botón "Siguiente" se deshabilita correctamente cuando no hay más resultados en búsqueda (v17.5)
- 🔄 Corrección de paginación en búsquedas - ahora mantiene los resultados de búsqueda al cambiar página (v17.4)
- 🎨 Interfaz simplificada y minimalista - colores unificados en escala de grises (v17.3)
- ❓ Iconos de ayuda pequeños para opciones de IA y embedders (v17.3)
- ⏱️ Spinner mínimo de 3 segundos en búsquedas para mejor UX (v17.2)
- 📁 Panel de Propiedades del Índice colapsable y cerrado por defecto (v17.2)
- 🔍 Mejora en manejo de errores de API - ahora muestra detalles completos de errores de Meilisearch (v17.1)
- 🔐 Sistema de login implementado con usuario zeroazul y clave 43r1tnd*.*V1nc3nt+ (v17.0)
- 🔐 Mantenimiento de sesión en navegador con expiración de 24 horas (v17.0)
- 🔍 Debug mejorado para búsqueda híbrida con IA - logs detallados de errores (v16.9)
- 🔧 Inclusión de parámetros adicionales en búsqueda híbrida (matchingStrategy, rankingScoreThreshold) (v16.9)
- 🔧 Corrección de búsqueda híbrida con IA - agregado semanticRatio requerido (v16.8)
- ✨ Control de Semantic Ratio para ajustar búsqueda semántica vs texto (v16.8)
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
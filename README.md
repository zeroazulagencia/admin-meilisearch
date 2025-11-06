# DWORKERS - Agencia de Inteligencia Artificial

## 📋 Descripción General

**DWORKERS** es una landing page moderna desarrollada en Next.js que presenta una agencia especializada en inteligencia artificial y agentes IA. La aplicación ofrece información sobre servicios de automatización empresarial, multiagentes y asistentes digitales.

## 🎯 Propósito

Landing page corporativa para DWORKERS, una agencia de inteligencia artificial especialista en:
- **Agentes IA personalizados**
- **Multiagentes coordinados**
- **Asistentes digitales para WhatsApp 24/7**
- **Sistemas de automatización integral**
- **Analizadores de datos y generadores de informes**

## 🚀 Características Principales

### 🎨 Interfaz y Diseño
- **Diseño moderno y responsive**: Adaptado a todos los dispositivos
- **Animaciones fluidas**: Efectos slide-up para elementos visuales
- **Botones flotantes**: WhatsApp y volver arriba siempre accesibles
- **Navegación intuitiva**: Menú de navegación sticky con enlaces suaves

### 🤖 Presentación de Servicios
- **Asistente de WhatsApp 24/7**: Servicio de atención al cliente con IA
- **Sistema de Automatización Integral**: Automatización completa de procesos empresariales
- **Analizador de Datos**: Generación automática de informes y tableros

### 📱 Funcionalidades Interactivas
- **Formulario de contacto**: Sistema de contacto integrado con validación
- **Modal de login**: Acceso al panel de administración
- **FAQ expandible**: Preguntas frecuentes con acordeón
- **Animaciones basadas en scroll**: Elementos que aparecen al hacer scroll

### 🎭 Efectos Visuales
- **Animación slide-up**: Workers que aparecen desde abajo cuando el título está visible
- **Iconos flotantes**: Iconos con efecto de flotación continua
- **Transiciones suaves**: Animaciones CSS para mejor experiencia de usuario

## 🏗️ Arquitectura Técnica

### Frontend
- **Framework**: Next.js 14 con App Router
- **UI**: Tailwind CSS con componentes personalizados
- **Estado**: React Hooks (useState, useEffect)
- **Tipado**: TypeScript para mayor robustez
- **Fuente**: Raleway para tipografía moderna

### Componentes Principales
- **ImageWithSkeleton**: Componente de carga de imágenes con skeleton loader
- **VideoWithSkeleton**: Componente de carga de videos con spinner
- **SectionCTA**: Componente de llamadas a la acción reutilizable
- **AlertModal**: Modal de alertas para feedback al usuario

## 🗂️ Estructura del Proyecto

```
admin-dworkers/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Autenticación
│   │   └── contact/              # Formulario de contacto
│   ├── globals.css              # Estilos globales y animaciones
│   ├── layout.tsx               # Layout principal
│   └── page.tsx                 # Landing page principal
├── components/                   # Componentes React
│   ├── ui/                      # Componentes UI base
│   │   └── AlertModal.tsx      # Modal de alertas
│   └── AuthProvider.tsx         # Proveedor de autenticación
├── public/                      # Archivos estáticos
│   └── public-img/              # Imágenes y videos
├── tmp/                        # Archivos temporales
├── settings.json              # Configuración del proyecto
├── package.json               # Dependencias
├── tailwind.config.js        # Configuración Tailwind
├── tsconfig.json             # Configuración TypeScript
└── README.md                 # Documentación
```

## 🚀 Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Instalación
```bash
# Clonar repositorio
git clone [url-del-repositorio]
cd admin-dworkers

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# Ejecutar en desarrollo
npm run dev
```

### ⚙️ Configuración de Variables de Entorno

El proyecto utiliza variables de entorno para todas las credenciales y API keys. 

**Archivo `.env.example`** contiene la plantilla con todas las variables necesarias:

- `OPENAI_API_KEY`: API key de OpenAI para embeddings y estructuración de documentos
- `SENDGRID_API_KEY`: API key de SendGrid para envío de emails
- `SENDGRID_FROM_EMAIL`: Email remitente para SendGrid
- `SENDGRID_TO_EMAIL`: Email destinatario para SendGrid
- `MYSQL_HOST`: Host de MySQL (default: localhost)
- `MYSQL_USER`: Usuario de MySQL (default: root)
- `MYSQL_PASSWORD`: Contraseña de MySQL
- `MYSQL_DATABASE`: Nombre de la base de datos (default: admin_dworkers)
- `MEILISEARCH_URL`: URL del servidor Meilisearch
- `MEILISEARCH_API_KEY`: API key de Meilisearch
- `N8N_URL`: URL del servidor N8N
- `N8N_API_KEY`: API key de N8N

**IMPORTANTE**: 
- Nunca subas el archivo `.env` al repositorio
- El archivo `.env` está en `.gitignore` y no se versiona
- Copia `.env.example` a `.env` y completa con tus valores reales

### Scripts Disponibles
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linter
```

## 🎨 Características de Diseño

### Paleta de Colores
- **Color primario**: #5DE1E5 (Cyan)
- **Fondo**: Blanco (#FFFFFF)
- **Texto**: Gris oscuro (#1F2937)
- **Botones**: Cyan para acciones principales, Negro para login

### Animaciones
- **slide-up**: Animación de entrada desde abajo (1s cubic-bezier)
- **float-slow**: Animación de flotación continua (3s ease-in-out)
- **icon-roll-in**: Animación de entrada de iconos desde la derecha

### Responsive
- **Mobile First**: Diseño optimizado para móviles
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **Grid adaptativo**: Columnas que se ajustan según el tamaño de pantalla

## 📱 Funcionalidades Específicas

### Botones Flotantes
- **WhatsApp**: Botón flotante verde en la esquina inferior derecha
  - Número: 573195947797
  - Link directo a WhatsApp Web
- **Volver arriba**: Botón flotante negro en la esquina inferior izquierda
  - Aparece después de hacer scroll 300px
  - Scroll suave al top

### Animaciones de Workers
- Los 3 workers principales (worker3, worker5, worker4) aparecen con efecto slide-up
- La animación se activa cuando el título de cada card entra en el viewport
- Se ocultan cuando el título sale del viewport
- Se reinician automáticamente cuando vuelven a entrar

### Formulario de Contacto
- Validación de campos requeridos
- Validación de email
- Honeypot para protección contra bots
- Captura de datos del navegador
- Integración con SendGrid para envío de emails

## 🔒 Seguridad

### Autenticación
- Sistema de login con credenciales
- Sesión persistente en localStorage
- Protección de rutas privadas
- Redirección automática si no está autenticado

### Validación
- Validación de entrada en todos los formularios
- Sanitización de datos antes de envío
- Manejo seguro de errores de API
- Honeypot en formulario de contacto

## 🔐 Parte Privada / Administración

### 🗄️ Base de Datos

**Sistema de Base de Datos**: MySQL

**Nombre de la Base de Datos**: `admin_dworkers`

**Configuración**:
- Host: Configurado mediante variable de entorno `MYSQL_HOST` (default: localhost)
- Usuario: Configurado mediante variable de entorno `MYSQL_USER` (default: root)
- Contraseña: Configurado mediante variable de entorno `MYSQL_PASSWORD`
- Base de datos: Configurado mediante variable de entorno `MYSQL_DATABASE` (default: admin_dworkers)
- Charset: utf8mb4_unicode_ci
- Motor: InnoDB

**Ubicación del Schema**: `/database/schema.sql`

#### Estructura de Tablas

**Tabla: `clients`**
- **Propósito**: Almacena información de clientes del sistema
- **Campos principales**:
  - `id`: ID único autoincremental (PRIMARY KEY)
  - `name`: Nombre del cliente (VARCHAR 255)
  - `email`: Email único del cliente (VARCHAR 255, UNIQUE)
  - `phone`: Teléfono del cliente (VARCHAR 50)
  - `company`: Nombre de la empresa (VARCHAR 255)
  - `clave`: Clave de acceso (VARCHAR 255)
  - `permissions`: Permisos en formato JSON
  - `status`: Estado del cliente (ENUM: 'active', 'inactive', 'pending')
  - `created_at`: Fecha de creación (TIMESTAMP)
  - `updated_at`: Fecha de actualización (TIMESTAMP)
- **Índices**: status, name, email

**Tabla: `agents`**
- **Propósito**: Almacena información de agentes IA asociados a clientes
- **Relación**: 1:N con `clients` (FOREIGN KEY: client_id)
- **Campos principales**:
  - `id`: ID único autoincremental (PRIMARY KEY)
  - `client_id`: ID del cliente asociado (FOREIGN KEY, NOT NULL)
  - `name`: Nombre del agente (VARCHAR 255)
  - `email`: Email del agente (VARCHAR 255)
  - `phone`: Teléfono del agente (VARCHAR 50)
  - `agent_code`: Código único del agente (VARCHAR 100, UNIQUE)
  - `status`: Estado del agente (ENUM: 'active', 'inactive', 'pending')
  - `created_at`: Fecha de creación (TIMESTAMP)
  - `updated_at`: Fecha de actualización (TIMESTAMP)
- **Índices**: client_id, status, agent_code
- **Cascada**: ON DELETE CASCADE, ON UPDATE CASCADE

### 🌐 Servicios Externos Consumidos

#### 1. **Meilisearch** - Motor de Búsqueda
- **URL**: `https://server-search.zeroazul.com/`
- **API Key**: Configurada en `settings.json` y `utils/constants.ts`
- **Propósito**: 
  - Gestión de índices de búsqueda
  - Búsqueda semántica y vectorial
  - Configuración de embedders y embeddings
  - CRUD de documentos
- **Ruta API**: `/api/meilisearch/[...path]`
- **Utilidad**: `utils/meilisearch.ts`

#### 2. **N8N** - Automatización de Workflows
- **URL**: `https://automation.zeroazul.com/`
- **API Key**: Configurada en `app/api/n8n/[...path]/route.ts`
- **Propósito**:
  - Gestión de workflows de automatización
  - Consulta de ejecuciones de workflows
  - Monitoreo de ejecuciones en tiempo real
- **Ruta API**: `/api/n8n/[...path]`
- **Utilidad**: `utils/n8n.ts`

#### 3. **OpenAI** - Inteligencia Artificial
- **URL**: `https://api.openai.com/v1/`
- **API Key**: Configurada mediante variable de entorno `OPENAI_API_KEY`
- **Propósito**:
  - Explicación de errores y ejecuciones de n8n (`/api/openai/explain`)
  - Estructuración de chunks de documentos PDF (`/api/openai/structure-chunk`)
  - Generación de embeddings (usado por Meilisearch)
- **Modelos utilizados**: `gpt-3.5-turbo`
- **Rutas API**: `/api/openai/explain`, `/api/openai/structure-chunk`

#### 4. **SendGrid** - Envío de Emails
- **URL**: `https://api.sendgrid.com/v3/mail/send`
- **API Key**: Configurada mediante variable de entorno `SENDGRID_API_KEY`
- **Propósito**:
  - Envío de emails del formulario de contacto
  - Notificaciones del sistema
- **Configuración**:
  - `SENDGRID_FROM_EMAIL`: Email remitente (default: zero@zeroazul.com)
  - `SENDGRID_TO_EMAIL`: Email destinatario (default: cristia.parada@zeroazul.com)
- **Ruta API**: `/api/contact`

#### 5. **ipapi.co** - Geolocalización por IP
- **URL**: `https://ipapi.co/`
- **Propósito**: 
  - Detección de país del usuario en formulario de contacto
  - Información técnica adicional para análisis
- **Uso**: Llamada directa desde `/api/contact/route.ts`

## 📞 Contacto

### WhatsApp
- Número: +57 319 594 7797
- Disponible 24/7 a través del botón flotante

### Formulario Web
- Formulario de contacto integrado en la landing page
- Envío automático de emails

---

## Versión

v23.1

### Cambios recientes:
- 🔒 Migración de API keys a variables de entorno para mayor seguridad (v23.1)
- 🔑 Removido campo de API Key de OpenAI del formulario de embedder (v23.1)
- ⚙️ API keys ahora se obtienen automáticamente desde variables de entorno del servidor (v23.1)
- 📝 Creado archivo .env.example con todas las variables de entorno necesarias (v23.1)
- 🛡️ Actualizado código para usar MEILISEARCH_API_KEY y N8N_API_KEY desde variables de entorno (v23.1)
- 📚 Documentación de servicios externos y base de datos agregada al README (v23.0)
- 🗄️ Especificación completa de estructura MySQL (tablas clients y agents) (v23.0)
- 🌐 Documentación de servicios: Meilisearch, N8N, OpenAI, SendGrid, ipapi.co (v23.0)
- 🎨 Landing Page DWORKERS - Agencia de Inteligencia Artificial especialista en agentes IA (v22.0)
- 🎨 Botón login con fondo negro y texto blanco para mejor contraste (v22.0)
- 📱 Botón flotante de WhatsApp agregado (número: 573195947797) (v22.0)
- ⬆️ Botón "volver arriba" agregado a la izquierda inferior (v22.0)
- 🎭 Animación simplificada de workers - solo efecto slide-up cuando el título está visible (v22.0)
- 📍 Iconos de workers movidos más abajo para mejor posicionamiento (v22.0)
- 🔄 Animación reactiva de workers basada en visibilidad del título en viewport (v22.0)

---

**Desarrollado por Zero Azul** - 2025

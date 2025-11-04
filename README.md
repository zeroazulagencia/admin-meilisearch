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

# Ejecutar en desarrollo
npm run dev
```

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

## 📞 Contacto

### WhatsApp
- Número: +57 319 594 7797
- Disponible 24/7 a través del botón flotante

### Formulario Web
- Formulario de contacto integrado en la landing page
- Envío automático de emails

---

## Versión

v22.0

### Cambios recientes:
- 🎨 Landing Page DWORKERS - Agencia de Inteligencia Artificial especialista en agentes IA (v22.0)
- 🎨 Botón login con fondo negro y texto blanco para mejor contraste (v22.0)
- 📱 Botón flotante de WhatsApp agregado (número: 573195947797) (v22.0)
- ⬆️ Botón "volver arriba" agregado a la izquierda inferior (v22.0)
- 🎭 Animación simplificada de workers - solo efecto slide-up cuando el título está visible (v22.0)
- 📍 Iconos de workers movidos más abajo para mejor posicionamiento (v22.0)
- 🔄 Animación reactiva de workers basada en visibilidad del título en viewport (v22.0)

---

**Desarrollado por Zero Azul** - 2025

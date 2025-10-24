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

## Versión

v2

### Cambios en v2:
- ✨ Buscador de documentos integrado
- ✨ Información de campos filtrables, buscables y ordenables
- ✨ Detección y visualización de embeddings
- ✨ Interface mejorada con más detalles del índice


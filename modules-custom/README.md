# Sistema de Módulos Dinámicos - DWORKERS

## 🎯 Descripción

Sistema de plugins/módulos independientes que permite crear mini-desarrollos aislados sin afectar el sistema global.

## 📁 Estructura

```
modules-custom/
├── ejemplo-dashboard/          # Módulo de ejemplo
│   ├── index.tsx              # Componente principal (obligatorio)
│   └── config.json            # Metadata del módulo
└── [tu-modulo]/
    ├── index.tsx
    └── config.json
```

## 🚀 Crear un Nuevo Módulo

### 1. Crear desde la UI

Ve a `/modulos` y crea un nuevo módulo:
- **Título**: Nombre descriptivo (ej: "Dashboard de Ventas")
- **Descripción**: Explica qué hace el módulo
- **Agente**: Selecciona el agente asociado

El sistema generará automáticamente:
- `folder_name`: versión slug del título (ej: "dashboard-de-ventas")
- Carpeta en `modules-custom/[folder_name]/`

### 2. Crear la Implementación

Crea el archivo `modules-custom/[folder_name]/index.tsx`:

\`\`\`tsx
'use client';

import { useState } from 'react';

export default function MiModulo({ moduleData }: { moduleData?: any }) {
  const [count, setCount] = useState(0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Mi Módulo</h1>
      <button 
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Contador: {count}
      </button>
    </div>
  );
}
\`\`\`

### 3. (Opcional) Crear config.json

\`\`\`json
{
  "name": "Mi Módulo",
  "version": "1.0.0",
  "description": "Descripción del módulo",
  "author": "Tu Nombre",
  "icon": "🚀"
}
\`\`\`

## 📋 Reglas y Buenas Prácticas

### ✅ Permitido

- ✅ Consumir APIs externas (REST, GraphQL, etc.)
- ✅ Usar `fetch`, `axios` u otras librerías HTTP
- ✅ Hooks de React (`useState`, `useEffect`, etc.)
- ✅ Componentes de Tailwind CSS
- ✅ LocalStorage / SessionStorage
- ✅ Llamadas a servicios externos (OpenAI, n8n, etc.)
- ✅ Cualquier lógica que no requiera la BD del sistema

### ❌ No Permitido

- ❌ Acceso directo a la base de datos MySQL del sistema
- ❌ Importar componentes del sistema principal (excepto Tailwind)
- ❌ Modificar estado global de la aplicación
- ❌ Llamadas a APIs internas del sistema (usar APIs externas)

## 🎨 Componentes Disponibles

Puedes usar todas las utilidades de Tailwind CSS incluidas en el proyecto:

\`\`\`tsx
<div className="bg-white rounded-lg shadow p-6">
  <h2 className="text-xl font-bold text-gray-900">Título</h2>
  <p className="text-gray-600">Contenido</p>
</div>
\`\`\`

## 🔧 Acceso a Datos del Módulo

Tu componente recibe `moduleData` con información del módulo:

\`\`\`tsx
export default function MiModulo({ moduleData }: { moduleData?: any }) {
  console.log(moduleData.title);       // Título del módulo
  console.log(moduleData.folder_name); // Nombre de la carpeta
  console.log(moduleData.agent_name);  // Nombre del agente asociado
  
  return <div>...</div>;
}
\`\`\`

## 🌐 Ejemplo: Consumir API Externa

\`\`\`tsx
'use client';

import { useState } from 'react';

export default function APIModule() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.ejemplo.com/datos');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <button 
        onClick={fetchData}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {loading ? 'Cargando...' : 'Cargar Datos'}
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
\`\`\`

## 🔄 Hot Reload

Los cambios en tu módulo se reflejan automáticamente durante desarrollo:

1. Edita `modules-custom/[folder_name]/index.tsx`
2. Guarda el archivo
3. La página se recarga automáticamente con tus cambios

## 🐛 Debug

Si tu módulo no carga:

1. **Revisa la consola del navegador** para ver errores de React
2. **Verifica la ruta**: debe ser exactamente `modules-custom/[folder_name]/index.tsx`
3. **Verifica la sintaxis**: tu componente debe exportar `export default function`
4. **Revisa imports**: solo importa de React, no del sistema principal

## 📦 Ejemplo Completo

Ver módulo de ejemplo en: `modules-custom/ejemplo-dashboard/`

## 🎯 Flujo de Trabajo

1. **Crear módulo** → UI de `/modulos`
2. **Crear carpeta** → `modules-custom/[folder_name]/`
3. **Crear index.tsx** → Componente principal
4. **Abrir módulo** → Click en "Abrir Módulo" en el listado
5. **Desarrollar** → Editar, guardar, ver cambios

## 🔒 Seguridad

- Los módulos corren en el contexto del cliente (navegador)
- No tienen acceso al backend ni a la BD directamente
- Solo pueden comunicarse con APIs externas públicas
- El sistema principal está protegido del código de los módulos

---

**Desarrollado por DWORKERS** 🚀

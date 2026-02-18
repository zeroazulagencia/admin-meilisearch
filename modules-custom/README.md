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

## 🗄️ Base de Datos — Aislamiento por Módulo

Cada módulo que requiera persistencia de datos crea sus **propias tablas**, completamente independientes del sistema base. Esto garantiza que eliminar o desactivar un módulo no afecte otras partes del sistema.

### Convención de Naming

```
modulos_{agent_name}_{agent_id}_{purpose}
```

**Ejemplos:**
| Módulo | Tablas |
|--------|--------|
| Log Leads SUVI (agent: suvi, id: 12) | `modulos_suvi_12_leads`, `modulos_suvi_12_config` |
| Generador Carta Laboral (agent: lucas, id: 9) | `modulos_lucas_9_cartas`, `modulos_lucas_9_config` |

### Archivos de Migración

Cada módulo tiene su propio archivo SQL en `/database/`:
```
database/migration_create_modulos_{agent}_{id}_{purpose}.sql
```

Para ejecutar una migración en el servidor:
```bash
mysql -u root admin_dworkers < database/migration_create_modulos_{agent}_{id}_{purpose}.sql
```

### Tabla `_config` estándar

Todos los módulos que necesiten guardar credenciales o configuración usan esta estructura:
```sql
CREATE TABLE modulos_{agent}_{id}_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Reglas

- Tablas propias del modulo, sin foreign keys al sistema base
- Migraciones SQL en `/database/`
- El modulo accede a su BD solo a traves de sus API routes en `app/api/modulos/{folder_name}/`
- No acceder directamente a tablas del sistema (`clients`, `agents`, `modules`)

## APIs del Modulo — Convencion de Rutas

Cuando un modulo necesita API routes propias (para acceder a la BD, generar archivos, etc.)
estas DEBEN seguir esta estructura:

```
app/api/custom-module{id}/{folder_name}/
```

Donde `{id}` es el ID del modulo en la tabla `modules` y `{folder_name}` es el slug
exacto del modulo en `modules-custom/`.

```
modules-custom/log-leads-suvi/                    <- modulo ID 1
app/api/custom-module1/log-leads-suvi/            <- sus API routes

modules-custom/generador-carta-laboral/           <- modulo ID 3
app/api/custom-module3/generador-carta-laboral/   <- sus API routes
cartas-pdf/generador-carta-laboral/               <- sus archivos generados
```

El prefijo `custom-module{id}` permite encontrar al instante todas las rutas de
un modulo por su ID, sin importar cuantos modulos existan en el proyecto.

JAMAS usar `app/api/modulos/` para routes de modulos custom. Esa carpeta no existe.

## Seguridad

- Los modulos corren en el contexto del cliente (navegador)
- No tienen acceso al backend ni a la BD directamente
- Solo pueden comunicarse con sus propias API routes o APIs externas
- El sistema principal esta protegido del codigo de los modulos

---

**Desarrollado por DWORKERS**

# AGENTS.md

Guia para agentes automaticos en este repositorio. Sigue estas reglas y las
instrucciones en `/.github/copilot-instructions.md`.

Reglas externas detectadas:
- Cursor rules: no existen archivos en `/.cursor/rules/` ni `/.cursorrules`.
- Copilot rules: usar `/.github/copilot-instructions.md` como fuente obligatoria.

-------------------------------------------------------------------------------

## Comandos (build, lint, test)

Basado en `package.json`:

```bash
# Desarrollo (puerto 4444)
npm run dev

# Build de produccion
npm run build

# Servidor de produccion (puerto 8988)
npm run start

# Lint (Next.js ESLint)
npm run lint
```

PM2 (despliegue):

```bash
pm2 start ecosystem.config.js
pm2 restart admin-meilisearch --update-env
```

Checklist pre-deploy (obligatorio antes de reiniciar):

```bash
# 1. Confirma que todos los cambios estén comprometidos (no push requerido)
git status

# 2. Ejecuta build con timeout amplio
npm run build

# 3. Reinicia con PM2 una vez el build termine
pm2 restart admin-meilisearch --update-env
```

Tests:
- No hay suite de tests configurada en este repo.
- No existe comando oficial para ejecutar un solo test.
- Si se agrega un runner, documentar el comando en este archivo.

-------------------------------------------------------------------------------

## Arquitectura y carpetas clave

- App Router de Next.js: `app/` y rutas API en `app/api/**/route.ts`.
- UI compartida: `components/` y `components/ui/`.
- Utilidades: `utils/` (DB, encryption, permissions, meilisearch).
- Modulos dinamicos: `modules-custom/[folder_name]/index.tsx`.
- Migraciones: `database/migration_*.sql` (no usar `schema.sql` en produccion).

-------------------------------------------------------------------------------

## Estilo de codigo

### Imports
- Orden sugerido: externos -> internos con alias `@/` -> relativos.
- Preferir alias `@/` para rutas internas.
- Evitar imports circulares.

### Formato
- Mantener el estilo existente: 2 espacios, comillas simples y punto y coma.
- No reformatear archivos completos sin necesidad.

### TypeScript y tipos
- `strict: true` en `tsconfig.json`.
- Evitar `any` salvo casos justificados y aislados.
- Tipos para respuestas API y estructuras DB cuando sea posible.

### Naming
- Componentes: PascalCase.
- Funciones/variables: camelCase.
- Constantes: UPPER_SNAKE_CASE.
- Rutas y carpetas: kebab-case cuando aplique.

### Manejo de errores
- En rutas API: `try/catch` y `NextResponse.json` con `{ ok: false }` y `status`.
- Loguear con prefijo claro (ej: `[API AGENTS]`), sin exponer secretos.
- No silenciar errores criticos; retornar mensajes claros al frontend.

-------------------------------------------------------------------------------

## Base de datos y seguridad

- Usar `utils/db` y queries parametrizadas (evitar SQL injection).
- Nunca ejecutar `database/schema.sql` en produccion con data existente.
- Usar migraciones incrementales en `database/migration_*.sql`.
- `ENCRYPTION_KEY` no debe cambiar una vez existan tokens cifrados.

WhatsApp y datos sensibles:
- Tokens de WhatsApp siempre cifrados usando `utils/encryption`.
- No enviar campos de WhatsApp si no se van a actualizar.
- Enmascarar tokens antes de devolverlos al frontend.

Modulo de seguridad (obligatorio):
- Debe existir un modulo exclusivo de seguridad con escaner CLI.
- El escaner debe indicar claramente los puntos a corregir.

-------------------------------------------------------------------------------

## Modulos custom

Convencion de rutas (critica):

```
modules-custom/{folder_name}/            # UI del modulo
app/api/custom-module{id}/{folder_name}/ # API del modulo
{storage}/{folder_name}/                 # archivos generados
```

Reglas:
- Los modulos son auto-contenidos y no deben acceder directo a la DB.
- El `folder_name` viene del registro en la UI `/modulos`.
- No usar `app/api/modulos/` para modulos custom.

Configuracion por modulo:
- Tabla: `modulos_{nombre}_{id}_config`.
- Obtener keys con `getConfig('key_name')`.
- Nunca hardcodear API keys en codigo o `.env`.

-------------------------------------------------------------------------------

## UI y componentes

- UI con Tailwind CSS y shadcn/ui.
- Desarrollo en modo componentes: reutilizables y parametrizados.
- No modificar componentes compartidos sin analizar impacto global.
- No agregar iconos, colores o elementos visuales extra sin solicitud.
- Prohibido usar emojis en codigo, UI, comentarios, logs o docs.

-------------------------------------------------------------------------------

## Operacion y servidores

- No cambiar puertos sin preguntar.
- No detener servidores sin pedirlo.
- Si un servidor se apaga, debe reiniciarse.
- Verificar puertos antes de ejecutar procesos.
- No ejecutar servidores que no fueron solicitados.
- Cada despliegue debe ejecutar `npm run build` y luego `pm2 restart admin-meilisearch --update-env`.

-------------------------------------------------------------------------------

## Documentacion

- Evitar crear nuevos `.md` innecesarios.
- La documentacion vive en el README principal.
- Este archivo es la excepcion para reglas de agentes.

-------------------------------------------------------------------------------

## Idioma y forma de respuesta (para agentes)

- Responder siempre en espanol.
- Contenido ordenado, clasificado y estructurado.
- Sin textos largos ni explicaciones innecesarias.
- Hacer unicamente lo solicitado.


-------------------------------------------------------------------------------

## Referencias obligatorias

- `/.github/copilot-instructions.md`
- `/README.md`
- `/docs/DEPLOY.md`
- `/scripts/verify-whatsapp-data.sh`

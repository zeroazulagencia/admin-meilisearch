# AGENTS.md

## Design Style — Modern SaaS

### Colors
- **Primary:** #3B82F6
- **Secondary:** #FFFFFF
- **Background:** #F9FAFB
- **Text (Dark):** #111827

### Typography
- **Font:** Inter
- **Hero Headline:** 64px · weight 700 · line-height 1.1
- **Subheading:** 24px · weight 400
- **Body:** 16px · weight 400 · line-height 1.6

### Spacing & Layout
- **Section spacing:** 128px
- **Container padding:** 32px
- **Element gaps:** 24px
- **Max width (desktop):** 1280px

### Visual Style
- **Shadows:** `0 4px 6px rgba(0,0,0,0.1)`
- **Corners:** 12px radius
- **Interactions:** smooth hover transitions
- **Accents:** gradient highlights on primary CTAs
- **Feel:** clean · minimal · premium · modern SaaS

### Responsive Behavior
- **Mobile (<768px)**
  - Vertical stacking
  - Larger touch targets

- **Tablet (768–1023px)**
  - Two-column layouts
  - Balanced spacing

- **Desktop (≥1024px)**
  - Full layout
  - Centered content
  - Max-width 1280px

### Tech Stack & UI System
- **CSS:** Tailwind CSS
- **Components:** shadcn/ui
- **Rules:**
  - Utility-first styling
  - Extend components visually, no forks
  - Consistency over creatividad

---

## Reglas Obligatorias del Agente (Uso Estricto)

Estas reglas **siempre deben cumplirse**. No son sugerencias.

### 1. Idioma y Forma de Responder
- Responder **siempre en español**.
- Contenido ordenado, clasificado y estructurado.
- Sin textos largos ni explicaciones innecesarias.
- Creatividad limitada a lo estrictamente solicitado.
- Hacer **únicamente** lo que se pide.

### 2. Preguntas Obligatorias Antes y Después de Responder

**Antes de actuar:**
- ¿Esto fue solicitado explícitamente?
- ¿Impacta otras partes del sistema?
- ¿Requiere confirmación?
- ¿Afecta puertos, servidores o componentes reutilizables?

**Al final de cada respuesta:**
- **¿Debo reiniciar el servidor?**
  - Si la respuesta es **sí**, reiniciarlo de forma autónoma.

### 3. Servidores, Puertos y Procesos
- No cambiar puertos sin preguntar.
- No detener servidores sin preguntar.
- Si un servidor se apaga, **debe volver a iniciarse**.
- Verificar puertos antes de ejecutar procesos.
- En conflicto de puertos, usar uno diferente.
- Evitar matar procesos sin revisión previa.
- No ejecutar servidores no solicitados.

### 4. Componentes y Reutilización
- El desarrollo se realiza **siempre en modo componentes**.
- Cada parte del sistema es un **componente reutilizable**.
- Los componentes deben ser **modificables por parámetros**, no por cambios internos.
- Objetivo: facilitar edición, extensión y mantenimiento.
- **NUNCA JAMÁS** modificar un componente reutilizable sin medir impacto global.
- Verificar siempre que ningún cambio dañe otras partes.
- No agregar funciones, validaciones, textos o mejoras no pedidas.

### 5. Diseño Visual y UI
- No agregar íconos ni colores si no se solicitan explícitamente.
- Usar solo lo definido en el template o tema base.
- Agregar íconos **solo** cuando se indique.
- No añadir elementos visuales adicionales.

### 6. Documentación
- No crear archivos `.md` innecesarios.
- Toda la documentación vive en el **README principal**.

### 7. Stack Tecnológico Preferido

**Frontend**
- Next.js
- Tailwind CSS

**Backend**
- Node.js
- Laravel (solo proyectos grandes)

**Base de Datos**
- MySQL
- Prisma ORM

**Librerías**
- Framer Motion (animaciones)
- React Flow (diagramas)

### 8. Seguridad (Obligatorio)
- Incluir siempre un **módulo exclusivo de seguridad**.
- El módulo debe contener:
  - Carpeta con **escáner de vulnerabilidades por consola**.
- El escáner debe:
  - Ejecutarse por CLI
  - Indicar claramente los puntos a corregir

### 9. Archivos Temporales y Pruebas
- Ningún archivo en `/tmp` puede ser parte funcional.
- Todo archivo temporal o de prueba vive **solo en `/tmp`**.

### 10. Logs
- Crear archivo `log.txt`.
- Agregar líneas **solo** cuando se pida explícitamente.

### 11. Depuración
Si se solicita debug, usar formato simple en consola:


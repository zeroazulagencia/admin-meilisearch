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
- **JAMÁS usar emojis en ningún lugar: código, UI, comentarios, logs ni documentación.**

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

### 11. Depuracion
Si se solicita debug, usar formato simple en consola:

### 12. API Keys para Modulos Custom
Para integraciones con servicios externos (OpenAI, etc.), usar el sistema centralizado de API keys:

**Tabla:** `api_keys`
```sql
CREATE TABLE api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_name VARCHAR(50) UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  last_verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Uso en codigo:**
```typescript
import { getApiKey } from '@/utils/api-keys';

const apiKey = await getApiKey('openai');
```

**Endpoints disponibles:**
- `GET /api/api-keys` - Listar keys (enmascaradas)
- `POST /api/api-keys` - Crear/actualizar key
- `DELETE /api/api-keys` - Eliminar key
- `POST /api/api-keys/verify` - Verificar validez

**Reglas:**
- NUNCA hardcodear API keys en codigo ni `.env`
- Usar `getApiKey('service_name')` para obtener keys
- Las keys se almacenan en BD, no en archivos
- La UI debe mostrar keys enmascaradas (primeros 10 + ultimos 4 caracteres)
- Cada modulo custom debe tener su pestana de configuracion para API keys

---

## Deployment

### Servidor de Produccion
- **Proveedor:** Hetzner Cloud
- **IP:** 89.167.79.168
- **Dominio:** https://workers.zeroazul.com
- **OS:** Ubuntu
- **Acceso SSH:** `ssh root@89.167.79.168` (via SSH key ed25519)
- **App path:** `/root/admin-meilisearch`

### Stack en Produccion
- **Runtime:** Node.js 20
- **BD:** MariaDB (usuario: bitnami, BD: admin_dworkers)
- **Reverse Proxy:** nginx
- **Process Manager:** PM2 (nombre: admin-meilisearch)
- **SSL:** Let's Encrypt (certbot, auto-renovacion)

### Flujo de Deploy
```bash
# 1. Desde local: push cambios
git add . && git commit -m "descripcion" && git push origin master

# 2. En el servidor remoto: pull + rebuild
ssh root@89.167.79.168
cd /root/admin-meilisearch
git pull origin master
npm run build
pm2 restart admin-meilisearch

# 3. O en un solo comando desde local:
ssh root@89.167.79.168 "cd /root/admin-meilisearch && git pull origin master && npm run build && pm2 restart admin-meilisearch"
```

### Desarrollo Local (conexion a BD remota)
```bash
# Tunel SSH para conectar a la BD de produccion
ssh -L 3307:127.0.0.1:3306 root@89.167.79.168 -N -f

# .env local usa MYSQL_PORT=3307
```

### Comandos Utiles
```bash
# Ver logs en produccion
ssh root@89.167.79.168 "pm2 logs admin-meilisearch --lines 50"

# Estado del proceso
ssh root@89.167.79.168 "pm2 status"

# Reiniciar app
ssh root@89.167.79.168 "pm2 restart admin-meilisearch"

# Renovar certificado SSL (automatico, pero manual si necesario)
ssh root@89.167.79.168 "certbot renew"
```


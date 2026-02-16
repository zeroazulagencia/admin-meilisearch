# Copilot Instructions - Admin Meilisearch (DWORKERS)

## Project Overview

Next.js 14 application for managing AI agents, clients, and knowledge bases. Integrates with Meilisearch (search), N8N (workflows), OpenAI (AI), Salesforce, and WhatsApp Business API.

**Core Purpose:** Multi-tenant admin panel where clients manage their AI agents, knowledge bases, conversations, and custom modules.

## Build & Development Commands

```bash
# Development (port 8989)
npm run dev

# Production build
npm run build

# Production server (port 8988)
npm run start

# Linting
npm run lint

# PM2 deployment
pm2 start ecosystem.config.js
pm2 restart admin-meilisearch --update-env
```

**No test suite configured.** Tests are in node_modules only.

## High-Level Architecture

### Directory Structure

```
app/
  ├── api/                    # Next.js API routes (REST endpoints)
  │   ├── agents/            # Agent CRUD
  │   ├── clients/           # Client management
  │   ├── conversations/     # Conversation history
  │   ├── meilisearch/       # Meilisearch proxy
  │   ├── n8n/              # N8N workflow proxy
  │   ├── modulos/          # Custom modules API
  │   ├── webhooks/         # External webhooks (Facebook, WhatsApp)
  │   └── oauth/            # OAuth flows (Salesforce)
  ├── agentes/              # Agent management UI
  ├── clientes/             # Client management UI
  ├── modulos/              # Dynamic modules system UI
  └── [feature]/            # Other feature pages
components/
  ├── ProtectedLayout.tsx   # Auth wrapper for pages
  └── ui/                   # Reusable UI components
utils/
  ├── db.ts                 # MySQL connection pool
  ├── encryption.ts         # Token encryption (WhatsApp)
  ├── permissions.ts        # Route-based permissions
  ├── meilisearch.ts        # Meilisearch client
  └── modulos/              # Custom module utilities
database/
  ├── schema.sql            # Full schema (reference only)
  └── migration_*.sql       # Incremental migrations
modules-custom/
  └── [folder-name]/        # Dynamic modules (loaded at runtime)
      └── index.tsx         # Module React component
```

### Key Architectural Patterns

**1. Dynamic Module System**
- Modules registered in DB (`custom_modules` table) with `folder_name` slug
- Components lazy-loaded from `modules-custom/[folder_name]/index.tsx`
- Each module is self-contained, consumes external APIs only
- Example: `log-leads-suvi` (Facebook → OpenAI → Salesforce pipeline)

**2. Multi-Tenant Permissions**
- `type: 'admin'` → full access
- `type: 'client'` → restricted to own agents/data
- Enforced via `utils/permissions.ts` and `ProtectedLayout.tsx`
- Client selection in LocalStorage: `selected_client_id`

**3. External Service Proxies**
- `/api/meilisearch/[...path]` → proxies to Meilisearch server
- `/api/n8n/[...path]` → proxies to N8N server
- Centralizes API keys in server-side env vars

**4. WhatsApp Token Encryption**
- All WhatsApp tokens stored **encrypted** in DB
- `utils/encryption.ts` uses AES-256-CBC with `ENCRYPTION_KEY` env var
- **CRITICAL:** `ENCRYPTION_KEY` must never change after tokens are encrypted
- Fields: `whatsapp_access_token`, `whatsapp_webhook_verify_token`, `whatsapp_app_secret`

**5. Database Schema Evolution**
- **NEVER** run `database/schema.sql` on production with existing data
- Use incremental migrations: `database/migration_*.sql`
- Verify schema changes don't break existing data

## Key Conventions

### 1. API Route Structure
```typescript
// app/api/[resource]/route.ts
export async function GET(req: NextRequest) { /* list */ }
export async function POST(req: NextRequest) { /* create */ }

// app/api/[resource]/[id]/route.ts
export async function GET(req, { params }) { /* get one */ }
export async function PUT(req, { params }) { /* update */ }
export async function PATCH(req, { params }) { /* partial update */ }
export async function DELETE(req, { params }) { /* delete */ }
```

### 2. Database Queries
```typescript
import { query } from '@/utils/db';

// Always use parameterized queries to prevent SQL injection
const agents = await query<Agent>('SELECT * FROM agents WHERE client_id = ?', [clientId]);
```

### 3. Environment Variables
- **Required:** See `.env.example` for all vars
- **ENCRYPTION_KEY:** Must be 32+ chars, never change
- Validate at startup: `utils/validate-env.ts`

### 4. WhatsApp Field Protection
- When updating agents, **do not send** WhatsApp fields unless explicitly changing them
- Backend preserves existing encrypted values if fields are undefined/null
- Frontend filters out empty WhatsApp fields before PUT/PATCH

### 5. Component Development (Component-First)
- Build reusable components, not page-specific code
- Components are parameterized, not hardcoded
- Avoid modifying shared components without impact analysis
- Custom modules should be self-contained

### 6. Permissions & Auth
```typescript
import { getPermissions } from '@/utils/permissions';

const permissions = getPermissions(); // reads from localStorage
if (permissions?.type !== 'admin') {
  // restrict access
}
```

### 7. Styling & Design System
- **Tailwind CSS** utility-first
- **shadcn/ui** components (extend, don't fork)
- Primary color: `#5DE1E5` (cyan)
- Font: Inter (from AGENTS.md design system)
- Responsive: Mobile-first, breakpoints at 768px, 1024px

### 8. Idioma y Respuesta (from AGENTS.md)
- Responder **siempre en español**
- Contenido ordenado, clasificado, estructurado
- Sin explicaciones innecesarias
- Hacer **únicamente** lo solicitado

### 9. Server Management
- Development port: **8989**
- Production port: **8988** (PM2)
- Before restart: always run `bash scripts/verify-whatsapp-data.sh`
- After changes requiring rebuild: `npm run build && pm2 restart admin-meilisearch --update-env`

### 10. Module Development
- Create in UI at `/modulos` → generates `folder_name` slug
- Implement at `modules-custom/[folder_name]/index.tsx`
- Component receives `moduleData` prop with metadata
- **No direct DB access** from modules (use external APIs)

## Important Files

- `AGENTS.md` - Agent development rules (always follow)
- `README.md` - Full project documentation
- `docs/DEPLOY.md` - Deployment checklist
- `docs/CAMBIOS_REALIZADOS.md` - Change history
- `settings.json` - Project metadata and version
- `.env.example` - Required environment variables
- `scripts/verify-whatsapp-data.sh` - Pre-deploy verification

## Pre-Deployment Checklist

Before any production deploy:
1. ✅ Run `bash scripts/verify-whatsapp-data.sh`
2. ✅ Verify `ENCRYPTION_KEY` is configured and unchanged
3. ✅ Test build: `npm run build`
4. ✅ Check no schema.sql is being run on production DB

## Example: Log Leads SUVI Module (Module ID: 1)

**URL:** https://workers.zeroazul.com/modulos/1  
**Folder:** `modules-custom/log-leads-suvi/`

This is a production example of the dynamic module system in action.

### What It Does
Automated lead capture pipeline: **Facebook Lead Ads → OpenAI Processing → Salesforce CRM**

### Architecture
```
1. Facebook sends webhook → /api/webhooks/facebook-leads
2. System fetches full lead data from Facebook Graph API
3. OpenAI enriches/structures data (name, country, service interest)
4. Classifies campaign type (Internal vs Agency)
5. Creates/updates Salesforce Account (UPSERT by email)
6. Creates Salesforce Opportunity with random owner from group
7. Updates DB with completion status
```

### Key Files
```
app/api/webhooks/facebook-leads/route.ts         # Facebook webhook handler
app/api/modulos/suvi-leads/route.ts              # List leads API
app/api/modulos/suvi-leads/[id]/route.ts         # Lead detail API
app/api/oauth/salesforce/authorize/route.ts      # Salesforce OAuth
app/api/oauth/salesforce/status/route.ts         # Token status check
utils/modulos/suvi-leads/orchestrator.ts         # Main flow coordinator
utils/modulos/suvi-leads/processors.ts           # FB, AI, classification logic
utils/modulos/suvi-leads/salesforce.ts           # Salesforce API calls
modules-custom/log-leads-suvi/index.tsx          # React dashboard
modules-custom/log-leads-suvi/README.md          # Full module docs
```

### Database Tables
- `modulos_suvi_12_leads` - Lead records with processing status
- `modulos_suvi_12_config` - Credentials (Facebook, OpenAI, Salesforce)
- `salesforce_oauth_tokens` - OAuth refresh tokens

### Processing States (9 total)
1. `recibido` - Webhook received
2. `consultando_facebook` - Fetching from Graph API
3. `limpiando_datos` - Data normalization
4. `enriqueciendo_ia` - OpenAI processing
5. `clasificando` - Campaign classification
6. `creando_cuenta` - Salesforce account UPSERT
7. `creando_oportunidad` - Salesforce opportunity creation
8. `completado` - Success
9. `error` - Failed (with error_message and error_step)

### Frontend Features
- Real-time stats dashboard (total, completed, errors, avg time)
- Salesforce OAuth connection status with expiry countdown
- Filters by status, campaign type, search
- Lead detail modal with full processing history
- Color-coded status badges

### Integration Points
- **Facebook:** Webhook verification with `hub.verify_token`
- **OpenAI:** GPT-4 for data structuring (full name, country detection, service inference)
- **Salesforce:** REST API + OAuth 2.0 with refresh tokens
  - UPSERT accounts using `Correo_Electr_nico__c` as External ID
  - Random owner selection from group `00G4W000006rHIN`
  - Valid projects hardcoded in `salesforce.ts`

### Configuration
All credentials stored in `modulos_suvi_12_config` table:
- `facebook_app_id`, `facebook_app_secret`, `facebook_access_token`
- `openai_api_key`
- `salesforce_access_token` (deprecated, use OAuth instead)
- `agency_campaigns` (JSON array for campaign classification)

### Working with This Module

**To add similar modules:**
1. Study the orchestrator pattern in `utils/modulos/suvi-leads/orchestrator.ts`
2. Each step updates DB status + current_step for real-time tracking
3. Errors caught at each step, stored with context
4. Frontend polls API for updates (no WebSockets)

**To modify the flow:**
1. Update orchestrator steps
2. Add new states to STATUS_COLORS in frontend
3. Run migration if new DB fields needed
4. Update README.md in module folder

## Common Patterns

### Adding a New Feature Page
1. Create page: `app/[feature]/page.tsx`
2. Add API routes: `app/api/[feature]/route.ts`
3. Add permission key to `utils/permissions.ts`
4. Update navbar in `components/Navbar.tsx`

### Adding a Custom Module
1. Create module record via `/modulos` UI
2. Create folder: `modules-custom/[folder-name]/`
3. Create component: `modules-custom/[folder-name]/index.tsx`
4. Module loads dynamically at `/modulos/[id]`

### Integrating External Service
1. Add API key to `.env.example`
2. Create proxy route: `app/api/[service]/[...path]/route.ts`
3. Add utility: `utils/[service].ts`
4. Document in README.md

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** MySQL 8 via mysql2 connection pool
- **Search:** Meilisearch (hosted)
- **Automation:** N8N (hosted)
- **AI:** OpenAI GPT-4
- **CRM:** Salesforce REST API + OAuth
- **Messaging:** WhatsApp Business API (Meta Graph API)
- **Process Manager:** PM2
- **Server:** AWS Lightsail (Bitnami Node.js)

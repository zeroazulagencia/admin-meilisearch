# Módulo Log Leads SUVI - Documentación Completa

## 📋 Descripción

Módulo que automatiza la captura y gestión de leads desde Facebook Lead Ads hasta Salesforce, siguiendo el flujo completo:

**Facebook → Limpieza → IA (OpenAI) → Clasificación → Salesforce (Cuenta + Oportunidad)**

---

## 🗄️ Base de Datos

### Tabla Principal: `modulos_suvi_12_leads`

Almacena cada lead con su progreso en tiempo real:

**Campos principales:**
- `leadgen_id`: ID único de Facebook
- `processing_status`: Estado actual (recibido, consultando_facebook, limpiando_datos, enriqueciendo_ia, clasificando, creando_cuenta, creando_oportunidad, completado, error)
- `facebook_raw_data`: Datos originales de Facebook (JSON)
- `ai_enriched_data`: Datos procesados por OpenAI (JSON)
- `salesforce_account_id`: ID de cuenta en Salesforce
- `salesforce_opportunity_id`: ID de oportunidad creada

### Tabla de Configuración: `modulos_suvi_12_config`

Almacena credenciales y parámetros:

| Config Key | Descripción |
|------------|-------------|
| `facebook_app_id` | App ID de Facebook |
| `facebook_app_secret` | App Secret de Facebook |
| `openai_api_key` | API Key de OpenAI |
| `salesforce_access_token` | Token de Salesforce |
| `salesforce_group_id` | ID del grupo de usuarios |
| `agency_campaigns` | Lista de campañas de agencia (JSON) |

---

## 🔌 API Endpoints

### 1. Webhook de Facebook
**URL:** `POST /api/webhooks/facebook-leads`

Recibe notificaciones de leads en tiempo real desde Facebook.

**Verificación (GET):**
```bash
GET /api/webhooks/facebook-leads?hub.mode=subscribe&hub.verify_token=suvi_webhook_verify_token_2024&hub.challenge=123
```

### 2. Listar Leads
**URL:** `GET /api/modulos/suvi-leads`

**Query params:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Resultados por página (default: 50)
- `status` (opcional): Filtrar por estado
- `campaign_type` (opcional): Filtrar por tipo de pauta
- `search` (opcional): Buscar en leadgen_id, campaña o cuenta

**Respuesta:**
```json
{
  "ok": true,
  "leads": [...],
  "pagination": {
    "page": 1,
    "total": 100,
    "totalPages": 2
  },
  "stats": {
    "total": 100,
    "completados": 85,
    "errores": 5,
    "en_proceso": 10,
    "avg_time": 450
  }
}
```

### 3. Detalle de Lead
**URL:** `GET /api/modulos/suvi-leads/[id]`

Devuelve información completa del lead incluyendo datos de Facebook, IA y Salesforce.

### 4. Actualizar Lead
**URL:** `PATCH /api/modulos/suvi-leads/[id]`

Permite actualizar manualmente el estado de un lead.

---

## 🔄 Flujo Completo

### Paso 1: Recepción del Lead (Facebook Trigger)
- Facebook envía webhook POST cuando alguien completa un formulario
- Se valida que el `form_id` no esté en la lista de bloqueados
- Se crea registro inicial en BD con estado `recibido`

### Paso 2: Consulta de Datos (Facebook Graph API)
- Se consulta `https://graph.facebook.com/v18.0/{leadgen_id}`
- Se obtiene `field_data` completo
- Estado: `consultando_facebook`

### Paso 3: Limpieza de Datos
- Convierte `field_data` de Facebook a JSON clave-valor limpio
- Estado: `limpiando_datos`

### Paso 4: Enriquecimiento con IA (OpenAI)
- Envía datos a GPT-4
- Estandariza nombres, deduce país, prefijo, servicio
- Genera resumen descriptivo
- Estado: `enriqueciendo_ia`

**Campos generados:**
```json
{
  "fullname": "Juan Pérez",
  "email": "juan@mail.com",
  "phone": "3011234567",
  "pais_salesforce": "Colombia",
  "prefijo": "+57",
  "servicio_de_interes": "Apartamento",
  "description": "Lead interesado en..."
}
```

### Paso 5: Clasificación de Campaña
- Compara nombre de campaña con listas predefinidas
- Asigna: `Pauta Interna` o `Pauta Agencia`
- Define `opportunity_type_id` para Salesforce
- Estado: `clasificando`

### Paso 5b: Leads Omitidos - Enviado a Google Sheet
- Si el formulario contiene "Pauta interna" o el form_id está en `blocked_form_ids`, el lead se marca como omitido.
- **Solo para omitidos:** Tras enriquecer con IA, se envía el payload por POST a:
  `https://automation.zeroazul.com/webhook/f3e51e7f-5c02-41c3-999e-0c11f72c1e85`
- Payload incluye: lead_id, leadgen_id, form_id, campaign_name, ad_name, omitido_reason, ai_enriched_data, sent_at.
- Estado final: `omitido_interno` con paso "Omitido - Enviado a Google Sheet".
- No se crea cuenta ni oportunidad en Salesforce.

### Paso 6: Crear/Actualizar Cuenta en Salesforce
- Hace UPSERT usando `Correo_Electr_nico__c` como External ID
- Incluye: Nombre, teléfono, prefijos, email
- Estado: `creando_cuenta`

### Paso 7: Obtener Cuenta
- Recupera ID y Name de la cuenta creada/actualizada

### Paso 8: Obtener Grupo de Usuarios
- Consulta SOQL: `SELECT UserOrGroupId FROM GroupMember WHERE GroupId='00G4W000006rHIN'`

### Paso 9: Seleccionar Owner Aleatorio
- Escoge aleatoriamente un usuario del grupo

### Paso 10: Obtener Proyectos
- Consulta `Proyecto__c` en Salesforce

### Paso 11: Seleccionar Proyecto Válido
- Escoge proyecto aleatorio de lista válida
- IDs válidos: Cámbulo, Bantué, Camino del viento, etc.

### Paso 12: Crear Oportunidad
- Crea oportunidad vinculada a la cuenta
- Asigna: Owner, Proyecto, Descripción, Tipo
- Estado: `creando_oportunidad`
- Al completar: `completado`

---

## 🔧 Configuración Inicial

### 1. Credenciales de Facebook
```sql
UPDATE modulos_suvi_12_config 
SET config_value = 'TU_APP_SECRET' 
WHERE config_key = 'facebook_app_secret';

UPDATE modulos_suvi_12_config 
SET config_value = 'TU_ACCESS_TOKEN' 
WHERE config_key = 'facebook_access_token';
```

### 2. Credenciales de Salesforce
```sql
UPDATE modulos_suvi_12_config 
SET config_value = 'TU_SALESFORCE_TOKEN' 
WHERE config_key = 'salesforce_access_token';
```

### 3. Configurar Webhook en Facebook
1. Ir a: Meta for Developers > Tu App > Webhooks
2. Agregar URL: `https://workers.zeroazul.com/api/webhooks/facebook-leads`
3. Verify Token: `suvi_webhook_verify_token_2024`
4. Suscribir a eventos: `leadgen`

### 4. Salesforce - External ID
Asegurarse que el campo `Correo_Electr_nico__c` en Account tenga marcado **"External ID"**.

---

## 📊 Dashboard Frontend

**URL:** https://workers.zeroazul.com/modulos/1

**Características:**
- ✅ Estadísticas en tiempo real
- ✅ Filtros por estado y tipo de campaña
- ✅ Búsqueda de leads
- ✅ Vista de detalle completa
- ✅ Indicadores visuales con colores por estado
- ✅ Tiempos de procesamiento

---

## 🐛 Solución de Problemas

### Error: "Salesforce access token no configurado"
**Solución:** Actualizar el token en la tabla `modulos_suvi_12_config`

### Error: "Facebook API error: Invalid OAuth 2.0 Access Token"
**Solución:** Verificar App ID y App Secret

### Lead en estado "error"
**Ver en BD:**
```sql
SELECT id, leadgen_id, error_message, error_step 
FROM modulos_suvi_12_leads 
WHERE processing_status = 'error';
```

---

## 📁 Estructura de Archivos

```
admin-meilisearch/
├── app/api/
│   ├── modulos/suvi-leads/
│   │   ├── route.ts (GET, POST)
│   │   └── [id]/route.ts (GET, PATCH)
│   └── webhooks/facebook-leads/
│       └── route.ts (GET, POST)
├── utils/modulos/suvi-leads/
│   ├── config.ts (Configuración y helpers)
│   ├── processors.ts (Facebook, IA, clasificación)
│   ├── salesforce.ts (Integraciones Salesforce)
│   └── orchestrator.ts (Flujo completo)
├── modules-custom/log-leads-suvi/
│   ├── index.tsx (Componente React)
│   └── config.json
└── database/
    ├── migration_create_modulos_suvi_12_leads.sql
    └── migration_create_modulos_suvi_12_config.sql
```

---

## 📤 Webhook para Leads Omitidos (Google Sheet)

Los leads que se marcan como `omitido_interno` (Pauta interna o formulario bloqueado) se envían automáticamente a un Google Sheet vía webhook:

- **URL:** `POST https://automation.zeroazul.com/webhook/f3e51e7f-5c02-41c3-999e-0c11f72c1e85`
- **Cuándo:** Solo para omitidos, después de enriquecer con IA
- **Payload (JSON):**
  - `lead_id`, `leadgen_id`, `form_id`, `campaign_name`, `ad_name`
  - `omitido_reason`: "Pauta Interna" o "Formulario Bloqueado"
  - `ai_enriched_data`: datos enriquecidos por IA
  - `sent_at`: timestamp ISO

---

## 🔐 Seguridad

- ✅ Credenciales almacenadas en BD (no en código)
- ✅ Tokens encriptados (flag `is_encrypted`)
- ✅ Webhook verificado con token secreto
- ✅ Validación de formularios bloqueados
- ✅ Logs detallados sin exponer credenciales

---

## 📈 Métricas y Monitoreo

El dashboard muestra:
1. **Total de leads** procesados
2. **Tasa de éxito** (completados vs errores)
3. **Tiempo promedio** de procesamiento
4. **Leads en proceso** activos
5. **Historial completo** con detalles por paso

---

## 🚀 Próximos Pasos

1. ✅ Sistema de reintentos automáticos para errores
2. ✅ Notificaciones por email cuando hay errores
3. ✅ Dashboard de métricas avanzado
4. ✅ Exportación de reportes
5. ✅ Webhooks de notificación a sistemas externos

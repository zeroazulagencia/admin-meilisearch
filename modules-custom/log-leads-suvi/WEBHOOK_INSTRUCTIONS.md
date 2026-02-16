# 🚀 Instrucciones de Configuración del Webhook - Módulo SUVI

## ✅ Arquitectura Implementada: Módulos 100% Independientes

El sistema ahora soporta webhooks dinámicos. Cada módulo tiene su propia URL única de webhook.

---

## 📍 URL del Webhook para Módulo SUVI (ID: 1)

### URL Completa
```
https://workers.zeroazul.com/api/module-webhooks/1/facebook
```

### Desglose
- **Dominio:** `workers.zeroazul.com`
- **Ruta base:** `/api/module-webhooks/`
- **ID del módulo:** `1` (ID de módulo SUVI en base de datos)
- **Proveedor:** `facebook` (nombre del archivo en `api/webhooks/`)

---

## 🔧 Configuración en Meta for Developers

### Paso 1: Acceder a tu App de Facebook
1. Ir a: https://developers.facebook.com
2. Seleccionar tu aplicación
3. Menú lateral → **Webhooks**

### Paso 2: Configurar el Webhook

**Callback URL:**
```
https://workers.zeroazul.com/api/module-webhooks/1/facebook
```

**Verify Token:**
```
suvi_webhook_verify_token_2024
```

**Campos a suscribir:**
- ✅ `leadgen` (Lead Generation)

### Paso 3: Verificar la Suscripción

Meta enviará una petición GET con:
```
GET https://workers.zeroazul.com/api/module-webhooks/1/facebook?hub.mode=subscribe&hub.verify_token=suvi_webhook_verify_token_2024&hub.challenge=XXXXX
```

**Respuesta esperada:** El challenge devuelto (código 200)

---

## 📨 Cómo Meta Envía los Datos

### Método HTTP
```
POST https://workers.zeroazul.com/api/module-webhooks/1/facebook
```

### Headers
```
Content-Type: application/json
X-Hub-Signature: sha1=... (firma de seguridad)
```

### Body (Ejemplo)
```json
{
  "entry": [
    {
      "id": "PAGE_ID",
      "time": 1708042424,
      "changes": [
        {
          "field": "leadgen",
          "value": {
            "leadgen_id": "1234567890",
            "page_id": "PAGE_123",
            "form_id": "FORM_456",
            "adgroup_id": "AD_789",
            "ad_id": "AD_101",
            "created_time": 1708042424
          }
        }
      ]
    }
  ],
  "object": "page"
}
```

---

## 🔄 Flujo Completo del Webhook

```
1. Usuario completa formulario en Facebook
   ↓
2. Facebook envía POST a: /api/module-webhooks/1/facebook
   ↓
3. Sistema base verifica módulo ID 1 en BD
   ↓
4. Carga dinámicamente: modules-custom/log-leads-suvi/api/webhooks/facebook.ts
   ↓
5. Handler del módulo procesa el lead
   ↓
6. Sistema responde 200 OK a Facebook (inmediato)
   ↓
7. Procesamiento continúa en background (orchestrator)
```

---

## 🧪 Probar el Webhook

### Verificación GET (desde terminal)
```bash
curl "https://workers.zeroazul.com/api/module-webhooks/1/facebook?hub.mode=subscribe&hub.verify_token=suvi_webhook_verify_token_2024&hub.challenge=test123"
```

**Respuesta esperada:** `test123`

### Envío de Lead de Prueba (POST)
```bash
curl -X POST https://workers.zeroazul.com/api/module-webhooks/1/facebook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "field": "leadgen",
        "value": {
          "leadgen_id": "TEST_LEAD_12345",
          "page_id": "PAGE_TEST",
          "form_id": "FORM_TEST"
        }
      }]
    }]
  }'
```

**Respuesta esperada:** `{"status":"received"}`

---

## 🗂️ Estructura del Módulo (Código)

```
modules-custom/log-leads-suvi/
├── api/
│   ├── webhooks/
│   │   └── facebook.ts           ← Handler del webhook
│   └── leads/
│       ├── route.ts              ← GET /api/module-api/1/leads
│       └── [id]/route.ts         ← GET /api/module-api/1/leads/[id]
├── utils/
│   ├── orchestrator.ts           ← Flujo completo del lead
│   ├── processors.ts             ← FB, IA, clasificación
│   ├── salesforce.ts             ← Integraciones SF
│   └── config.ts                 ← Configuración del módulo
└── index.tsx                     ← Dashboard React
```

---

## 📊 Otras APIs del Módulo

**Listar leads:**
```
GET https://workers.zeroazul.com/api/module-api/1/leads
```

**Detalle de lead:**
```
GET https://workers.zeroazul.com/api/module-api/1/leads/[id]
```

**Frontend del módulo:**
```
https://workers.zeroazul.com/modulos/1
```

---

## 🎯 Ventajas de esta Arquitectura

✅ **Independencia total:** Eliminar carpeta `log-leads-suvi` = módulo desaparece  
✅ **Sin conflictos:** Cada módulo tiene su propia URL de webhook  
✅ **Escalable:** Crear módulo 2 con webhook → `/api/module-webhooks/2/facebook`  
✅ **Múltiples apps Facebook:** Cada módulo puede tener su propia Facebook App  
✅ **Sin residuos:** No queda código hardcodeado en el proyecto base  

---

## ⚠️ IMPORTANTE: Actualizar URL en Facebook

**ANTES de activar el nuevo webhook:**

1. ✅ Hacer deploy del código nuevo
2. ✅ Verificar que build fue exitoso
3. ✅ Probar webhook con curl (GET verification)
4. ✅ Actualizar URL en Meta for Developers
5. ✅ Re-verificar suscripción
6. ✅ Probar con lead de prueba

**URL antigua (ya NO usar):**
```
❌ https://workers.zeroazul.com/api/webhooks/facebook-leads
```

**URL nueva (usar desde ahora):**
```
✅ https://workers.zeroazul.com/api/module-webhooks/1/facebook
```

---

## 📞 Resumen

**Método:** `POST`  
**URL:** `https://workers.zeroazul.com/api/module-webhooks/1/facebook`  
**Content-Type:** `application/json`  
**Verify Token:** `suvi_webhook_verify_token_2024`  
**Evento:** `leadgen`  

Meta envía los leads automáticamente con POST cada vez que alguien completa el formulario.

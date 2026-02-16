# 📋 INSTRUCCIONES FINALES DEL WEBHOOK - MÓDULO SUVI

## 🎯 Resumen Ejecutivo

**El sistema está refactorizado para soportar módulos 100% independientes con webhooks dinámicos.**

---

## 📍 CONFIGURACIÓN DEL WEBHOOK EN META

### URL del Webhook
```
https://workers.zeroazul.com/api/module-webhooks/1/facebook
```

### Método que Usa Meta
**POST** - Meta envía los leads con método HTTP POST automáticamente

### Verificación (GET)
Meta también envía peticiones GET para verificar el webhook con:
- `hub.mode=subscribe`
- `hub.verify_token=suvi_webhook_verify_token_2024`
- `hub.challenge=XXXXX`

---

## 🔧 Pasos para Configurar en Meta for Developers

### 1. Acceder a Webhooks
```
https://developers.facebook.com
→ Tu App
→ Webhooks (menú lateral)
→ Edit Subscription (o Add Webhook)
```

### 2. Configurar el Webhook

| Campo | Valor |
|-------|-------|
| **Callback URL** | `https://workers.zeroazul.com/api/module-webhooks/1/facebook` |
| **Verify Token** | `suvi_webhook_verify_token_2024` |
| **Eventos** | ✅ leadgen |

### 3. Guardar y Verificar
- Click en "Verify and Save"
- Meta enviará GET para verificar
- Debe responder 200 OK con el challenge

---

## 📨 Cómo Meta Envía los Datos

### Request
```http
POST https://workers.zeroazul.com/api/module-webhooks/1/facebook HTTP/1.1
Content-Type: application/json
X-Hub-Signature: sha1=...

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

### Response (Inmediata)
```json
{
  "status": "received"
}
```

El procesamiento del lead continúa en background.

---

## ⚠️ NOTA IMPORTANTE: ESTADO ACTUAL

### ⏳ Implementación Parcial

El sistema de webhooks dinámicos está **estructurado** pero **aún NO funcional al 100%**.

**Razón:** Next.js no puede importar archivos `.ts` en runtime desde `modules-custom/`.

**Soluciones posibles:**

1. **Compilar módulos** - Transpilar TypeScript a JavaScript durante deploy
2. **Usar `.js` directamente** - Escribir módulos en JavaScript
3. **Sistema de plugins** - Pre-compilar módulos antes del build de Next.js

### 🔄 Estado Actual del Webhook

**POR AHORA, sigue usando la URL antigua:**
```
✅ https://workers.zeroazul.com/api/webhooks/facebook-leads
```

Esta URL sigue funcionando (código hardcodeado en `app/api/webhooks/facebook-leads/route.ts`).

---

## 🚀 Próximos Pasos (Para Completar la Arquitectura)

### Opción 1: Transpilar Módulos
```bash
# En el módulo
cd modules-custom/log-leads-suvi
npx tsc api/**/*.ts --outDir dist

# Cargar desde dist en lugar de api
```

### Opción 2: Webpack/Bundler
Agregar paso de build que compile los módulos antes del `npm run build`.

### Opción 3: Convertir a .js
Renombrar todos los archivos `.ts` del módulo a `.js` y remover tipos.

---

## 📊 Arquitectura Implementada

### URLs Dinámicas Creadas
```
/api/module-api/[module_id]/[...path]/route.ts    ✅ Creado
/api/module-webhooks/[module_id]/[provider]/route.ts  ✅ Creado
```

### Estructura del Módulo
```
modules-custom/log-leads-suvi/
├── api/
│   ├── webhooks/
│   │   └── facebook.ts          ✅ Migrado
│   └── leads/
│       ├── route.ts             ✅ Migrado
│       └── [id]/route.ts        ✅ Migrado
├── utils/                        ✅ Migrado
└── index.tsx                     ✅ Existente
```

### Enrutadores Base
- ✅ Sistema detecta módulo por ID en BD
- ✅ Carga dinámicamente archivos del módulo
- ⚠️ Import falla porque Next.js no compila archivos fuera de app/

---

## 🎯 RESUMEN PARA HOY

### Lo que funciona:
✅ Arquitectura de webhooks dinámicos diseñada  
✅ Código del módulo organizado independientemente  
✅ Enrutadores base creados  
✅ Build exitoso  

### Lo que NO funciona aún:
❌ Import dinámico de archivos TypeScript del módulo  
❌ Webhook dinámico `/api/module-webhooks/1/facebook`  

### URL a usar HOY:
```
✅ https://workers.zeroazul.com/api/webhooks/facebook-leads
```

**Método:** POST  
**Verify Token:** suvi_webhook_verify_token_2024  
**Evento:** leadgen  

---

## 📞 Configuración Actual en Meta

```
Callback URL: https://workers.zeroazul.com/api/webhooks/facebook-leads
Verify Token: suvi_webhook_verify_token_2024
Subscribed Fields: leadgen
```

Esta configuración sigue siendo la correcta por ahora.

---

**Documentación creada:** 15 de febrero de 2026  
**Estado:** Arquitectura lista, pendiente resolver import dinámico de TypeScript

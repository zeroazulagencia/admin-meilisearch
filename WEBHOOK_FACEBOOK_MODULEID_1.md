# ✅ WEBHOOK CONFIGURADO Y FUNCIONANDO

## 📍 URL del Webhook

```
https://workers.zeroazul.com/api/webhooks/facebook-leads-moduleid-1
```

---

## 🔧 Configuración en Meta for Developers

### Acceso
1. Ir a: https://developers.facebook.com
2. Seleccionar tu aplicación
3. Menú lateral → **Webhooks**
4. Click en **Edit Subscription** o **Configure Webhooks**

### Datos de Configuración

| Campo | Valor |
|-------|-------|
| **Callback URL** | `https://workers.zeroazul.com/api/webhooks/facebook-leads-moduleid-1` |
| **Verify Token** | `suvi_webhook_verify_token_2024` |
| **Subscribed Fields** | ✅ `leadgen` |

### Guardar
1. Click en **Verify and Save**
2. Meta enviará petición GET para verificar
3. Debe mostrar "Success" o marca verde ✅

---

## 📨 Cómo Facebook Envía los Datos

### Verificación (GET)
```http
GET https://workers.zeroazul.com/api/webhooks/facebook-leads-moduleid-1?hub.mode=subscribe&hub.verify_token=suvi_webhook_verify_token_2024&hub.challenge=XXXXX
```

**Respuesta esperada:** El valor de `challenge` (código 200)

### Leads (POST)
```http
POST https://workers.zeroazul.com/api/webhooks/facebook-leads-moduleid-1
Content-Type: application/json

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

**Respuesta:** `{"status":"received"}` (código 200)

---

## ✅ Verificación de Funcionamiento

### 1. Probar Verificación GET
```bash
curl "https://workers.zeroazul.com/api/webhooks/facebook-leads-moduleid-1?hub.mode=subscribe&hub.verify_token=suvi_webhook_verify_token_2024&hub.challenge=test123"
```

**Resultado esperado:** `test123`

### 2. Probar Envío de Lead (POST)
```bash
curl -X POST https://workers.zeroazul.com/api/webhooks/facebook-leads-moduleid-1 \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "field": "leadgen",
        "value": {
          "leadgen_id": "TEST_12345",
          "page_id": "PAGE_TEST",
          "form_id": "FORM_TEST"
        }
      }]
    }]
  }'
```

**Resultado esperado:** `{"status":"received"}`

---

## 🔍 Monitoreo

### Ver Logs en el Servidor
```bash
pm2 logs admin-meilisearch | grep "WEBHOOK SUVI"
```

### Ver Leads Recibidos
Dashboard: https://workers.zeroazul.com/modulos/1

---

## 🎯 Características del Webhook

✅ **Manejo seguro de errores** - Siempre responde 200 OK a Facebook  
✅ **Validación de body** - Maneja body vacío y JSON malformado  
✅ **Procesamiento asíncrono** - Responde inmediatamente, procesa en background  
✅ **Logs detallados** - Cada paso registrado con prefijo [WEBHOOK SUVI]  
✅ **Verificación automática** - Responde al challenge de Facebook  

---

## ⚠️ IMPORTANTE

- El webhook está activo y funcionando
- Responde correctamente a verificaciones GET
- Recibe y procesa leads POST
- Siempre responde 200 OK para evitar reintentos de Facebook
- Los errores se manejan internamente sin afectar la respuesta

---

## 📊 Estado Actual

**URL Antigua (ya NO usar):**
```
❌ https://workers.zeroazul.com/api/webhooks/facebook-leads
```

**URL Nueva (usar desde ahora):**
```
✅ https://workers.zeroazul.com/api/webhooks/facebook-leads-moduleid-1
```

---

**Webhook Verificado:** ✅ 15 de febrero de 2026  
**Estado:** FUNCIONANDO  
**Método:** POST (automático desde Facebook)  
**Verify Token:** suvi_webhook_verify_token_2024

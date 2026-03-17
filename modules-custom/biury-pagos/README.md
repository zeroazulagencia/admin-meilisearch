# Módulo 8 - Biury Pagos → Siigo

Recibe webhooks de Treli (pagos WooCommerce), filtra productos "BiuryBox Trimestre" y crea comprobantes contables en Siigo.

## Webhook

| Tipo | URL |
|------|-----|
| POST | `POST https://workers.zeroazul.com/api/module-webhooks/8/webhook` |

### Payload esperado

```json
{
  "email": "administrativa@biury.co",
  "access_key": "ZTdlODgwM2UtN2M1Yi00OGVhLWE0YmEtNjM0MWY3ZGI1NTVjOjU2UDwqKT53b1g=",
  "content": {
    "payment_id": "treli_123",
    "billing": { "document": "12345678" },
    "payment_gateway_name": "Wompi",
    "totals": { "total": 299000 },
    "items": [{ "name": "BiuryBox Trimestre" }]
  }
}
```

### Autenticación

- **email**: Debe ser `administrativa@biury.co`
- **access_key**: Se valida contra la config del módulo

### Filtrado

Solo procesa productos que contengan "BiuryBox Trimestre". Los demás se marcan como `filtered` (no es error).

## Configuración (UI)

En **https://workers.zeroazul.com/modulos/8** > **Configuración**:

- **Access Key**: Token de autenticación del webhook

El token de Siigo se obtiene automáticamente de la BD legacy (`dbkdhc4hwzxlgz`) en cada llamado.

## APIs

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/custom-module8/biury-pagos` | Listado de logs |
| GET | `/api/custom-module8/biury-pagos/[id]` | Detalle de un registro |
| GET | `/api/custom-module8/biury-pagos/config` | Config (enmascarada) |
| PUT | `/api/custom-module8/biury-pagos/config` | Actualizar config |

## Tablas

- **modulos_biury_8_config**: `access_key`
- **modulos_biury_8_logs**: `payment_id`, `customer_document`, `product_name`, `gateway`, `total`, `siigo_response`, `status`, `created_at`

## Flujo

1. Webhook recibe payload con `email`, `access_key` y `content`
2. Se valida email y access_key
3. Se filtra por producto "BiuryBox Trimestre"
4. Se obtiene token de Siigo desde BD legacy
5. Se crea voucher en Siigo:
   - Wompi → cuenta 11200501 (débito)
   - MercadoPago → cuenta 11100501 (débito)
   - Contra-partida: 28050501 (Anticipos Clientes) a 3 meses
6. Se guarda log con respuesta de Siigo

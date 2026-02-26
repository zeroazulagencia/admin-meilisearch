# Módulo 6 - SUVI Opportunity (Ventas / Crédito)

Recibe payload por webhook (ventas o crédito), crea/actualiza cuenta en Salesforce, asigna asesor por ruleta según tipo, busca proyecto por nombre y crea oportunidad. Sin IA ni Meta.

## Configuración en BD

1. Ejecutar migración de tablas: `mysql -u USUARIO -p admin_dworkers < database/migration_create_modulos_suvi_6.sql`
2. Asegurar que el módulo 6 use esta carpeta: `UPDATE modules SET folder_name = 'suvi-opportunity' WHERE id = 6;`
- OAuth Salesforce se reutiliza del módulo 1 (mismo token en modulos_suvi_12_config).

## Webhooks (solo GET)

| Tipo    | URL |
|---------|-----|
| Ventas  | `GET https://workers.zeroazul.com/api/module-webhooks/6/ventas` |
| Crédito | `GET https://workers.zeroazul.com/api/module-webhooks/6/credito` |

- **Método:** solo **GET**. Los datos se envían en la **query string** (no hay body ni header de token).
- **Origen permitido:** solo se aceptan peticiones cuyo **Referer** o **Origin** sea `https://suviviendainternacional.com` (p. ej. formularios o enlaces desde ese sitio). Cualquier otro origen recibe `403`.

### Parámetros (query string)

Requeridos: **nombre**, **apellido**, **email** (o correo electrónico), **telefono** (o Teléfono/Celular).  
Opcionales: **pais**, **indicativo**, **ciudad**, **proyecto** (nombre del proyecto en Salesforce).

### Ejemplo desde el dominio permitido

En la web de Suvivienda (suviviendainternacional.com) usar un enlace o formulario GET, por ejemplo:

```
https://workers.zeroazul.com/api/module-webhooks/6/ventas?nombre=Juan&apellido=Pérez&email=juan@ejemplo.com&telefono=3001234567&proyecto=MiProyecto
```

### Probar con curl (simulando Referer)

```bash
curl -s -H "Referer: https://suviviendainternacional.com/" \
  "https://workers.zeroazul.com/api/module-webhooks/6/ventas?nombre=Test&apellido=Uno&email=test@ejemplo.com&telefono=123456"
```

Sin el header Referer (o con otro dominio) la respuesta será `403`.

Respuesta esperada al aceptar: `{"ok":true,"id":1,"tipo":"ventas"}` o similar.

### Verificar que el webhook existe (sin datos)

```bash
curl -s "https://workers.zeroazul.com/api/module-webhooks/6/ventas"
# Sin Referer devolverá 403. Con Referer y sin params puede devolver error de validación o ok según implementación.
```

## Cómo verificar que llegaron los datos

1. En el navegador: https://workers.zeroazul.com/modulos/6 — en la tabla deben aparecer los registros.
2. Por API:
   - Listar: `curl -s "https://workers.zeroazul.com/api/custom-module6/suvi-opportunity"`
   - Detalle: `curl -s "https://workers.zeroazul.com/api/custom-module6/suvi-opportunity/1"` (cambiar 1 por el id).

## Tablas

- **modulos_suvi_6_opportunities**: registro por cada envío (email, nombre, apellido, tipo, estado, ids de Salesforce, etc.).
- **modulos_suvi_6_config**: webhook_secret (no usado en GET), salesforce_group_id_ventas, salesforce_group_id_credito, record_type_ventas, record_type_credito, valid_project_ids.

## APIs del módulo

- `GET /api/custom-module6/suvi-opportunity` — listado (query: page, limit, tipo, status, search).
- `GET /api/custom-module6/suvi-opportunity/[id]` — detalle.
- `GET /api/custom-module6/suvi-opportunity/config` — config (webhook_secret enmascarado).
- `PUT /api/custom-module6/suvi-opportunity/config` — actualizar config.
- `POST /api/custom-module6/suvi-opportunity/reenviar` — body `{ "id": number }` para reprocesar un registro.

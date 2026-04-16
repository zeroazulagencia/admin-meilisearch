# Módulo 6 - SUVI Opportunity (Ventas / Crédito)

Recibe payload por webhook (ventas o crédito), crea/actualiza cuenta en Salesforce, asigna asesor por ruleta según tipo, busca proyecto por nombre y crea oportunidad. Sin IA ni Meta.

## Configuración en BD

1. Ejecutar migración de tablas: `mysql -u USUARIO -p admin_dworkers < database/migration_create_modulos_suvi_6.sql`
2. Asegurar que el módulo 6 use esta carpeta: `UPDATE modules SET folder_name = 'suvi-opportunity' WHERE id = 6;`
- OAuth Salesforce se reutiliza del módulo 1 (mismo token en modulos_suvi_12_config).

## Webhooks (POST)

| Tipo    | URL |
|---------|-----|
| Ventas  | `POST https://workers.zeroazul.com/api/module-webhooks/6/ventas` |
| Crédito | `POST https://workers.zeroazul.com/api/module-webhooks/6/credito` |

- **Método:** solo **POST**. Se acepta `application/json` o `application/x-www-form-urlencoded`.
- **Origen permitido:** no se valida el `Referer`; la protección se realiza en Salesforce.

### Payload

Enviar los campos del lead dentro del body. Se soportan dos formatos:

1. **JSON plano** (`{ "nombre": "Juan", "apellido": "Pérez", ... }`).
2. **Elementor / WordPress** (`fields[field][value]` o `fields[field]`).

Campos mínimos: nombre, apellido, email y teléfono. Opcionales: país, indicativo, ciudad, nombre del proyecto y `form[id]` para identificar variantes.

### Ejemplo JSON

```bash
curl -X POST "https://workers.zeroazul.com/api/module-webhooks/6/ventas" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@example.com",
    "telefono": "+573001234567",
    "pais": "Colombia",
    "form[id]": "a98c5f6"
  }'
```

### Ejemplo form-urlencoded

```bash
curl -X POST "https://workers.zeroazul.com/api/module-webhooks/6/credito" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "fields[name]=Juan Pérez" \
  --data-urlencode "fields[email]=juan@example.com" \
  --data-urlencode "fields[tel]=+573001234567" \
  --data-urlencode "form[id]=a98c5f6"
```

Respuesta esperada: `{"ok":true,"id":1,"tipo":"ventas"}` (cambiar tipo según ruta).

Para verificar conectividad sin payload:

```bash
curl -X POST -s "https://workers.zeroazul.com/api/module-webhooks/6/ventas"
```

## Cómo verificar que llegaron los datos

1. En el navegador: https://workers.zeroazul.com/modulos/6 — en la tabla deben aparecer los registros.
2. Por API:
   - Listar: `curl -s "https://workers.zeroazul.com/api/custom-module6/suvi-opportunity"`
   - Detalle: `curl -s "https://workers.zeroazul.com/api/custom-module6/suvi-opportunity/1"` (cambiar 1 por el id).

## Variantes de formularios

El módulo detecta la variante según `form[id]` y aplica reglas específicas para nombrar campos y calcular el prefijo telefónico (`indicativo`). Variantes activas:

1. **Formulario proyecto** (`form[id]=b08bdc3`)
   - Campos: `fields[FirstName][value]`, `fields[LastName][value]`, `fields[Email][value]`, `fields[MobilePhone][value]`, `fields[Pais_de_Residencia__c][value]`, `fields[Ciudad_de_Residencia__c][value]`, `fields[Proyecto][value]`.
   - El país se guarda tal cual llega.
2. **Interes crédito** (`form[id]=c197850`)
   - Misma estructura que Formulario proyecto.
3. **Landing Crédito** (`form[id]=ecbe21e`)
   - Campos: `fields[name]`, `fields[field_78cc91b]` (apellido), `fields[email]`, `fields[message]` (teléfono), `fields[field_a27c238]` (país).
   - El país se normaliza a `País(+indicativo)` usando un diccionario; si llega "Colombia" se convierte en `Colombia(+57)`.
4. **Contacto web** (`form[id]=a98c5f6`)
   - Campos: `fields[name]`, `fields[email]`, `fields[tel]`, `fields[message]` (comentarios). También incluye metadatos como `meta[page_url]`, `meta[user_agent]`, etc.
   - Reglas especiales:
     - Se divide el campo `name` en nombre y apellido (todo lo que esté después del primer espacio se convierte en apellido).
      - Si no se recibe país o indicativo, se fuerza `Estados Unidos (+1)` con prefijo `1` para cumplir con Salesforce.

## Tablas

- **modulos_suvi_6_opportunities**: registro por cada envío (email, nombre, apellido, tipo, estado, ids de Salesforce, forma variante, indicativo, etc.).
- **modulos_suvi_6_config**: webhook_secret (no usado en GET), salesforce_group_id_ventas, salesforce_group_id_credito, record_type_ventas, record_type_credito, valid_project_ids.

## APIs del módulo

- `GET /api/custom-module6/suvi-opportunity` — listado (query: page, limit, tipo, status, search).
- `GET /api/custom-module6/suvi-opportunity/[id]` — detalle.
- `GET /api/custom-module6/suvi-opportunity/config` — config (webhook_secret enmascarado).
- `PUT /api/custom-module6/suvi-opportunity/config` — actualizar config.
- `POST /api/custom-module6/suvi-opportunity/reenviar` — body `{ "id": number }` para reprocesar un registro.

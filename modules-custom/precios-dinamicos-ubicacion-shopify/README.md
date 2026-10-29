# Módulo 30 — Precios dinámicos por ubicación (Shopify, El Retén del Casco)

Base: `https://workers.zeroazul.com/api/custom-module30/precios-dinamicos-ubicacion-shopify`

Lo consume el snippet `precio-dinamico.liquid` del tema de retendelcasco.com.
**Todas las rutas llevan barra final** (sin ella el servidor responde 308 y un POST se pierde).

CORS: solo `https://retendelcasco.com`, `https://www.retendelcasco.com` y
`https://el-reten-del-casco.myshopify.com`. Todas las respuestas llevan `Cache-Control: no-store`.

---

## Cómo se decide la ubicación (una sola función para `/geo/` y `/checkout/`)

`utils/modulos/precios-dinamicos-ubicacion-shopify-30/ubicacion.ts` → `resolverUbicacion()`

| Paso | Condición | `fuente` | Municipio | Descuento |
|---|---|---|---|---|
| 1 | Coordenadas del navegador **válidas** | `gps` | Polígono DANE que contiene el punto | Regla del municipio; si no hay, la del departamento |
| 2 | Sin GPS y `ciudad` del **pop-up** que coincide con una regla | `popup` | La ciudad elegida | Regla de esa ciudad |
| 3a | Sin GPS ni pop-up e IP de un **ASN móvil** | `ip-movil` | `null` | **Ninguno** |
| 3b | Sin GPS ni pop-up e IP de un **operador fijo confiable** | `ip` | GeoLite2-City | Regla del municipio; si no hay, la del departamento |
| 3c | Sin GPS ni pop-up y cualquier otra IP | `ip` | GeoLite2-City (solo informativa) | **Ninguno**. Movistar (AS3816) mezcla fijo y móvil (pedido #2659: Cúcuta con regla de Bogotá) |
| 4 | Nada aplica | — | — | Precio de lista |

En los pasos 3a–3c `requiere_ubicacion: true`: el tema pide el GPS y, si falla o se niega,
muestra el pop-up con las ciudades del metaobjeto. Si el cliente cierra el pop-up, decide la IP.

**Operadores fijos confiables** (constante `ASN_FIJOS_CONFIABLES`): AS19429 ETB. UNE/EPM
(AS13489) y Telmex (AS10620) quedaron fuera porque su IP no coincidió con el GPS en los logs.

**Coordenadas válidas**: `lat`, `lng` y `acc` numéricos; dentro de Colombia
(lat −4,3 … 13,6 · lng −82,0 … −66,8, incluye San Andrés) y `0 <= acc <= 5000` metros.
Si no cumplen se **ignoran** sin error y se sigue al paso 2.

**Por qué el paso 2**: las IPs móviles en Colombia geolocalizan a Bogotá estén donde
estén (caso draft #D1529: cliente en Cúcuta recibió la regla de Bogotá por una IP de Claro).

**ASN móviles** (constante `ASN_MOVILES` en `ubicacion.ts`):

| ASN | Operador |
|---|---|
| 26611 | Comcel / Claro móvil |
| 27831 | Colombia Móvil / Tigo |
| 271773 | WOM (Partners Telecom Colombia) |

Movistar (AS3816) no está en ninguna lista: su IP nunca da regla.

**Reglas**: metaobjeto `municipiosxdescuento` del tema, leído de
`https://retendelcasco.com/?section_id=precio-dinamico-reglas` (caché 15 s). Cruce con
nombres normalizados (sin tildes, minúsculas, trim): primero el municipio (nombre común
y nombre oficial DANE, p. ej. "Cúcuta" y "San José de Cúcuta"), luego el departamento.
El backend es la **única fuente de verdad** del descuento: el tema usa `regla` tal cual.

---

## `GET /geo/`

```
GET /geo/                                   → decide por IP
GET /geo/?lat=7.8939&lng=-72.5078&acc=30    → decide por coordenadas (si son válidas)
GET /geo/?ciudad=Bogotá                     → ciudad elegida en el pop-up
```

Respuesta `200`:

```json
{
  "fuente": "gps",                 // "gps" | "popup" | "ip" | "ip-movil"
  "ciudad": "Cúcuta",              // null si ip-movil o el punto no cae en ningún municipio
  "region": "Norte de Santander",
  "pais": "CO",
  "latitud": 7.8939,
  "longitud": -72.5078,
  "regla": null,                   // o { "municipio": "Bogotá", "descuento": 10 }
  "requiere_ubicacion": false      // true sin GPS ni pop-up ("ip" o "ip-movil")
}
```

- `regla.descuento`: positivo **baja** el precio (10 → −10 %), negativo lo **sube** (−10 → +10 %).
- Con `requiere_ubicacion: true` el tema pide la ubicación del navegador y repite con `lat/lng/acc`; si falla, muestra el pop-up y repite con `ciudad`.
- `429` con más de 60 consultas por minuto y por IP.

---

## `POST /checkout/`

```json
{
  "items": [{ "variant_id": 123, "quantity": 1 }],
  "ubicacion": { "lat": 7.8939, "lng": -72.5078, "acc": 30 },   // opcional
  "ciudad": "Bogotá",                                            // opcional, pop-up
  "dry_run": false                                               // opcional
}
```

- Límites: 1–50 líneas · `quantity` 1–20 · máx. 50 unidades · cuerpo ≤ 16 KB · 10 peticiones/min por IP.
- La regla se **recalcula siempre** en el servidor con `resolverUbicacion()`. Cualquier precio
  o descuento enviado por el cliente se ignora.

**Con regla y descuento ≠ 0** → crea un borrador sin completar (precio con `priceOverride`):

```json
{
  "ok": true,
  "checkout_url": "https://…/invoices/…",
  "draft_order_id": 1358221213940,
  "estado_token": "…",
  "descuento": 10,
  "regla": { "municipio": "Bogotá", "descuento": 10 },
  "requiere_ubicacion": false,
  "ubicacion": { "fuente": "gps", "ciudad": "Bogotá", "region": "Bogotá D.C.", "requiere_ubicacion": false }
}
```

**Sin regla, descuento 0 o sin GPS (`ip`/`ip-movil`)** → no crea nada; el tema sigue al **checkout normal** (precio de lista):

```json
{
  "ok": true,
  "checkout_url": null,
  "descuento": 0,
  "regla": null,
  "requiere_ubicacion": true,      // true sin GPS: pedir ubicación y volver a llamar
  "ubicacion": { "fuente": "ip-movil", "ciudad": null, "region": null, "requiere_ubicacion": true }
}
```

**`dry_run: true`** → no crea nada y devuelve además `lineas` (`precio_base`, `precio_final`),
`etiquetas` y `nota` tal como irían en el borrador.

**Borrador**:

- Nota: `Precio dinámico · <Municipio>/<Depto> · <regla X% | sin regla> · fuente <gps|ip|ip-movil> · GPS <lat>,<lng> (±<acc>m) · IP <ip>`
  (el tramo `GPS …` solo con fuente `gps`).
- Etiquetas: `precio-dinamico`, `pd-municipio-<slug>` (o `pd-departamento-<slug>` si la regla
  cruzó por departamento) y `pd-fuente-<gps|ip>`. Slug: sin tildes, minúsculas, guiones.

**Errores**: `400` entrada inválida · `404` variante inexistente o no disponible · `413` cuerpo
grande · `429` límite · `502` fallo de Shopify · `500` interno. Ante cualquier error el tema
debe seguir al checkout normal.

---

## `GET /checkout/estado/`

```
GET /checkout/estado/?draft_order_id=<id>&token=<estado_token>
```

→ `{ "ok": true, "draft_order_id": 123, "estado": "OPEN" | "INVOICE_SENT" | "COMPLETED", "pagado": false }`.
Si `pagado` es `true`, el tema vacía el carrito. Errores: `400` faltan parámetros · `403` token
inválido · `404` borrador inexistente o sin tag `precio-dinamico` · `429` > 60/min por IP · `502`.

---

## Datos

| Archivo | Origen | En git |
|---|---|---|
| `utils/modulos/precios-dinamicos-ubicacion-shopify-30/municipios-dane-mgn2018.geojson` | DANE, Marco Geoestadístico Nacional 2018, municipios (1.122), simplificado con mapshaper ([copia pública](https://github.com/caticoa3/colombia_mapa)); solo código DIVIPOLA, municipio y departamento, coordenadas a 5 decimales | Sí |
| `data/geoip/GeoLite2-City.mmdb` | MaxMind GeoLite2 City | No |
| `data/geoip/dbip-asn-lite.mmdb` | [DB-IP IP to ASN Lite](https://db-ip.com/db/download/ip-to-asn-lite) (CC BY 4.0). Actualizar mensualmente: `curl -L https://download.db-ip.com/free/dbip-asn-lite-AAAA-MM.mmdb.gz \| gunzip > data/geoip/dbip-asn-lite.mmdb` | No |

Si falta la base ASN no se detectan IPs móviles y se decide por IP (paso 3); queda un error en el log.

Los nombres oficiales DANE se muestran con su nombre común cuando difieren (`ALIAS_MUNICIPIO`
en `municipios.ts`: Bogotá, Cúcuta, Cartagena, Buga, Tumaco…). El cruce con las reglas prueba
ambos nombres.

## Tests

```bash
npm test
```

`tests/mod30-ubicacion.test.ts`: point-in-polygon con los polígonos reales (Cúcuta, Bogotá,
Bucaramanga, Medellín, mar) y la función de decisión con dependencias simuladas (gps, ip-movil,
ip, coordenadas inválidas, ASN desconocido).

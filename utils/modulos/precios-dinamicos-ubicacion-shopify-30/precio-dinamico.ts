// ============================================================
//  Módulo 30 — Lógica PURA de precios dinámicos
//  (sin imports: compilable y testeable de forma aislada)
//
//  Semántica de `descuento` (igual que el tema):
//    positivo BAJA el precio   (10  -> -10 %)
//    negativo SUBE el precio   (-10 -> +10 %)  ← Envigado -10 es intencional
// ============================================================

export interface ReglaPrecio {
  nombre: string;
  descuento: number;
}

export interface ItemEntrada {
  variant_id: number;
  quantity: number;
}

export const MAX_LINEAS = 50;
export const MAX_QTY_POR_LINEA = 20;
export const MAX_UNIDADES_TOTALES = 50;

const CLAVES_NOMBRE = ['municipio', 'ciudad', 'city', 'departamento', 'region', 'estado', 'nombre', 'name'];
const CLAVES_DESCUENTO = ['descuento', 'discount', 'porcentaje', 'percent', 'valor'];

/** Normaliza texto: NFD, sin tildes, minúsculas, espacios colapsados. */
export function normalizar(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function primerNumero(entry: Record<string, unknown>): number | null {
  for (const k of CLAVES_DESCUENTO) {
    const v = (entry as any)[k];
    if (v == null || v === '') continue;
    const n = Number(String(v).trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function primerNombre(entry: Record<string, unknown>): string | null {
  for (const k of CLAVES_NOMBRE) {
    const v = (entry as any)[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Extrae las reglas del HTML de la Section Rendering API de Shopify:
 *   <script type="application/json" id="precio-dinamico-reglas">[...]</script>
 * Tolerante a: array u objeto suelto, claves de nombre/departamento, claves de
 * descuento en español/inglés, número o string numérico.
 * Las reglas con descuento no finito o |descuento| > 100 se descartan.
 */
export function parseReglas(html: string): ReglaPrecio[] {
  const m = /<script[^>]*\bid=["']precio-dinamico-reglas["'][^>]*>([\s\S]*?)<\/script>/i.exec(String(html || ''));
  if (!m) return [];

  let data: unknown;
  try {
    data = JSON.parse(m[1].trim());
  } catch {
    return [];
  }

  const lista = Array.isArray(data) ? data : data && typeof data === 'object' ? [data] : [];
  const out: ReglaPrecio[] = [];

  for (const raw of lista) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    const nombre = primerNombre(entry);
    const descuento = primerNumero(entry);
    if (!nombre || descuento == null) continue;
    if (!Number.isFinite(descuento) || Math.abs(descuento) > 100) continue;
    out.push({ nombre, descuento });
  }

  return out;
}

/**
 * Cruce igual que el tema: PRIMERO por municipio/ciudad; si no hay match, por
 * departamento/región. (El metaobjeto guarda ambos casos bajo la misma clave
 * `municipio`, p. ej. {"municipio":"Antioquia","descuento":10}).
 */
export function cruzarRegla(
  reglas: ReglaPrecio[],
  ciudad: string | null,
  region: string | null
): ReglaPrecio | null {
  const c = normalizar(ciudad);
  const r = normalizar(region);

  if (c) {
    const porCiudad = reglas.find((g) => normalizar(g.nombre) === c);
    if (porCiudad) return porCiudad;
  }
  if (r) {
    const porRegion = reglas.find((g) => normalizar(g.nombre) === r);
    if (porRegion) return porRegion;
  }
  return null;
}

/** Precio unitario en COP sin decimales. Mismo cálculo que muestra el tema. */
export function precioUnitario(precioBase: number, descuento: number): number {
  const p = Math.round(precioBase * (1 - descuento / 100));
  return Number.isFinite(p) && p > 0 ? p : 0;
}

export type ResultadoValidacion =
  | { ok: true; items: ItemEntrada[] }
  | { ok: false; error: string };

/**
 * Valida lo ÚNICO que se acepta del navegador: { items: [{variant_id, quantity}] }.
 * Cualquier precio, descuento o campo extra que venga del cliente se IGNORA.
 */
export function validarEntrada(body: unknown): ResultadoValidacion {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'el cuerpo debe ser un objeto JSON' };
  }

  const itemsRaw = (body as any).items;
  if (!Array.isArray(itemsRaw)) {
    return { ok: false, error: 'items es requerido (array)' };
  }
  if (itemsRaw.length < 1) {
    return { ok: false, error: 'items debe tener al menos 1 línea' };
  }
  if (itemsRaw.length > MAX_LINEAS) {
    return { ok: false, error: `items no puede superar ${MAX_LINEAS} líneas` };
  }

  const acumulado = new Map<number, number>();

  for (let i = 0; i < itemsRaw.length; i++) {
    const it = itemsRaw[i];
    if (!it || typeof it !== 'object') {
      return { ok: false, error: `items[${i}] debe ser un objeto` };
    }

    const vidRaw = (it as any).variant_id;
    const vidNum = typeof vidRaw === 'number' ? vidRaw : Number(String(vidRaw ?? '').trim());
    if (!Number.isInteger(vidNum) || vidNum <= 0) {
      return { ok: false, error: `items[${i}].variant_id debe ser numérico` };
    }

    const qRaw = (it as any).quantity;
    const qNum = typeof qRaw === 'number' ? qRaw : Number(String(qRaw ?? '').trim());
    if (!Number.isInteger(qNum) || qNum < 1 || qNum > MAX_QTY_POR_LINEA) {
      return { ok: false, error: `items[${i}].quantity debe ser entero entre 1 y ${MAX_QTY_POR_LINEA}` };
    }

    acumulado.set(vidNum, (acumulado.get(vidNum) || 0) + qNum);
  }

  const entradas = Array.from(acumulado.entries());
  for (const [vid, q] of entradas) {
    if (q > MAX_QTY_POR_LINEA) {
      return { ok: false, error: `variant_id ${vid}: cantidad total ${q} supera el máximo de ${MAX_QTY_POR_LINEA}` };
    }
  }

  const total = entradas.reduce((a, par) => a + par[1], 0);
  if (total > MAX_UNIDADES_TOTALES) {
    return { ok: false, error: `unidades totales ${total} superan el máximo de ${MAX_UNIDADES_TOTALES}` };
  }

  return {
    ok: true,
    items: entradas.map(([variant_id, quantity]) => ({ variant_id, quantity })),
  };
}
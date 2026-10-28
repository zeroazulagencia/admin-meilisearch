import { parseReglas, type ReglaPrecio } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/precio-dinamico';

// ============================================================
//  Módulo 30 — Reglas municipio → % descuento
//  Vienen del metaobjeto `municipiosxdescuento` del tema, expuesto como JSON
//  en la sección `precio-dinamico-reglas` (Section Rendering API, público).
//  Compartido por /geo/ y /checkout/: el backend es la única fuente de verdad.
// ============================================================

const REGLAS_URL = 'https://retendelcasco.com/?section_id=precio-dinamico-reglas';
const REGLAS_TTL_MS = 15_000; // caché máxima 15 s

let cacheReglas: { at: number; reglas: ReglaPrecio[] } | null = null;

export async function obtenerReglas(): Promise<ReglaPrecio[]> {
  if (cacheReglas && Date.now() - cacheReglas.at < REGLAS_TTL_MS) {
    return cacheReglas.reglas;
  }

  try {
    const res = await fetch(`${REGLAS_URL}&t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} al leer reglas`);

    const reglas = parseReglas(await res.text());
    cacheReglas = { at: Date.now(), reglas };
    if (reglas.length === 0) {
      console.warn('[reglas] el tema devolvió 0 reglas (¿script #precio-dinamico-reglas ausente?)');
    }
    return reglas;
  } catch (err) {
    console.error('[reglas] no se pudieron leer las reglas del tema:', err);
    // Fail-open: si ya hubo una lectura buena, se usa; si no, sin reglas
    // (el cliente paga el precio normal).
    return cacheReglas ? cacheReglas.reglas : [];
  }
}

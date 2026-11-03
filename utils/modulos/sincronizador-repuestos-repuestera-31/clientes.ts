/**
 * Clientes HTTP del modulo 31: ERP Repuestera, WooCommerce y callback del plugin de WordPress.
 * Todos los errores de red/respuesta se reintentan (son "errores nuestros" o transitorios).
 */
import type { ErpPagina, WooCategoria, WooProducto } from './plan';

export interface Reintento {
  intentos: number;
  esperaMs: number;
  timeoutMs: number;
  onFallo?: (intento: number, error: string) => void;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchJson<T = any>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const raw = await res.text();
  if (!res.ok) throw new HttpError(`HTTP ${res.status} en ${new URL(url).pathname}: ${raw.substring(0, 200)}`, res.status);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(`Respuesta no JSON en ${new URL(url).pathname}: ${raw.substring(0, 200)}`, res.status);
  }
}

export async function conReintentos<T>(fn: () => Promise<T>, r: Reintento): Promise<T> {
  let ultimo: unknown;
  for (let i = 1; i <= r.intentos; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      r.onFallo?.(i, errorTexto(e));
      if (i < r.intentos) await dormir(r.esperaMs);
    }
  }
  throw ultimo;
}

export function errorTexto(e: unknown): string {
  if (e instanceof Error) return e.name === 'TimeoutError' ? 'Tiempo de espera agotado' : e.message;
  return String(e);
}

// ---------------------------------------------------------------- ERP

export interface ErpCredenciales {
  baseUrl: string;
  usuario: string;
  clave: string;
}

export async function erpToken(c: ErpCredenciales, r: Reintento): Promise<string> {
  const body = await conReintentos(
    () => fetchJson<{ token?: string }>(`${c.baseUrl}/Autenticacion/validacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: c.usuario, password: c.clave }),
    }, r.timeoutMs),
    r
  );
  if (!body?.token) throw new Error('El ERP no devolvio token');
  return body.token;
}

/** Pide paginas hasta que paginaActual >= totalPaginas. Cada pagina se reintenta por separado. */
export async function erpCatalogo(c: ErpCredenciales, token: string, r: Reintento, pageSize = 500): Promise<ErpPagina[]> {
  const paginas: ErpPagina[] = [];
  for (let page = 1; page <= 200; page++) {
    const pagina = await conReintentos(
      () => fetchJson<ErpPagina>(`${c.baseUrl}/Referencias/GetReferencias?page=${page}&pageSize=${pageSize}`, {
        headers: { Authorization: `Bearer ${token}` },
      }, r.timeoutMs),
      r
    );
    paginas.push(pagina);
    if (!pagina || Number(pagina.paginaActual) >= Number(pagina.totalPaginas)) break;
  }
  return paginas;
}

// ---------------------------------------------------------------- WooCommerce

export interface WooCredenciales {
  baseUrl: string;
  key: string;
  secret: string;
}

const wooHeaders = (c: WooCredenciales) => ({
  Authorization: `Basic ${Buffer.from(`${c.key}:${c.secret}`).toString('base64')}`,
  'Content-Type': 'application/json',
});

/** Pagina hasta que una pagina venga vacia. */
async function wooPaginado<T>(c: WooCredenciales, ruta: string, r: Reintento): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 500; page++) {
    const sep = ruta.includes('?') ? '&' : '?';
    const lista = await conReintentos(
      () => fetchJson<T[]>(`${c.baseUrl}${ruta}${sep}page=${page}`, { headers: wooHeaders(c) }, r.timeoutMs),
      r
    );
    if (!Array.isArray(lista)) throw new Error(`WooCommerce devolvio algo que no es lista en ${ruta}`);
    if (lista.length === 0) break;
    out.push(...lista);
  }
  return out;
}

export function wooProductos(c: WooCredenciales, r: Reintento, campos = 'id,name,sku,stock_quantity,manage_stock,regular_price,meta_data,catalog_visibility,images,status') {
  return wooPaginado<WooProducto>(c, `/products?per_page=100&status=any&orderby=id&order=asc&_fields=${campos}`, r);
}

export function wooCategorias(c: WooCredenciales, r: Reintento) {
  return wooPaginado<WooCategoria>(c, '/products/categories?per_page=100&hide_empty=false&orderby=id&order=asc&_fields=id,name,slug', r);
}

export async function wooCrearCategorias(c: WooCredenciales, create: { name: string; slug: string }[], r: Reintento) {
  return conReintentos(
    () => fetchJson<{ create?: (WooCategoria & { error?: { code?: string; message?: string } })[] }>(
      `${c.baseUrl}/products/categories/batch`,
      { method: 'POST', headers: wooHeaders(c), body: JSON.stringify({ create }) },
      r.timeoutMs
    ),
    r
  );
}

export async function wooBatch(c: WooCredenciales, create: unknown[], update: unknown[], r: Reintento) {
  return conReintentos(
    () => fetchJson<any>(`${c.baseUrl}/products/batch`, {
      method: 'POST',
      headers: wooHeaders(c),
      body: JSON.stringify({ create, update }),
    }, r.timeoutMs),
    r
  );
}

// ---------------------------------------------------------------- WordPress (plugin)

export async function wpCallback(url: string, token: string, payload: unknown, r: Reintento): Promise<number> {
  return conReintentos(async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sync-Token': token },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(r.timeoutMs),
    });
    if (!res.ok) throw new HttpError(`Callback WordPress HTTP ${res.status}: ${(await res.text()).substring(0, 200)}`, res.status);
    return res.status;
  }, r);
}

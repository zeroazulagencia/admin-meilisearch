/**
 * Logica pura del sincronizador ERP Repuestera -> WooCommerce (modulo 31).
 * Replica el workflow n8n CzgPuZ3f5m4Mx6V6 con las correcciones acordadas:
 * - sin categoria: no se envia categories (al crear) ni se toca la actual (al actualizar), y cuenta como error
 * - la proteccion del 70% compara contra la ultima corrida buena, no contra la tienda completa
 * - la duracion se mide con el reloj del servidor
 * Sin I/O: todo lo que toca red o BD vive en el worker.
 */

export interface ErpPagina {
  paginaActual?: number;
  tamanoPagina?: number;
  registrosDevueltos?: number;
  totalRegistros?: number;
  totalPaginas?: number;
  datos?: ErpRegistro[] | null;
}

export interface ErpRegistro {
  codigo?: unknown;
  descripcion?: unknown;
  descadicional?: unknown;
  descWeb?: unknown;
  clase?: unknown;
  grupo?: unknown;
  subgrupo?: unknown;
  subgrupo2?: unknown;
  contable?: unknown;
  porcentaje_iva?: unknown;
  costo_unitario?: unknown;
  stock?: unknown;
  infoPrecios?: Record<string, unknown> | null;
}

export type Precios = Record<string, number>;

export interface ProductoErp {
  sku: string;
  clave: string;
  nombre: string;
  descCorta: string;
  descLarga: string;
  costo: number;
  stock: number;
  clase: string;
  claseSlug: string;
  grupo: string;
  subgrupo: string;
  subgrupo2: string;
  contable: string;
  iva: number;
  precios: Precios;
}

export interface WooMeta {
  key: string;
  value: unknown;
}

export interface WooProducto {
  id: number;
  name?: string;
  sku?: string | null;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  regular_price?: string;
  meta_data?: WooMeta[];
  catalog_visibility?: string;
  images?: { id?: number }[];
  status?: string;
}

export interface WooCategoria {
  id: number;
  name?: string;
  slug?: string;
}

export interface Cambio {
  campo: string;
  anterior: unknown;
  nuevo: unknown;
}

export interface ErrorMuestra {
  tipo: string;
  sku: string | null;
  code: string | null;
  mensaje: string;
}

export interface DetalleCrear {
  sku: string;
  nombre: string;
}

export interface DetalleActualizar {
  sku: string;
  nombre: string;
  campos: Cambio[];
}

export interface Lote {
  create: Record<string, unknown>[];
  update: Record<string, unknown>[];
  detalleCrear: DetalleCrear[];
  detalleActualizar: DetalleActualizar[];
}

export const PRECIOS_KEYS = Array.from({ length: 10 }, (_, i) => `precio_${i + 1}`);

const NOMBRE_CAMPO: Record<string, string> = {
  stock: 'Stock',
  clase: 'Clase',
  grupo: 'Grupo',
  subgrupo: 'Subgrupo',
  subgrupo2: 'Subgrupo 2',
  contable: 'Contable',
  iva: '% IVA',
  manage_stock: 'Gestion de stock',
};
for (let n = 1; n <= 10; n++) NOMBRE_CAMPO[`precio_${n}`] = `Precio ${n}`;

// ---------------------------------------------------------------- normalizacion

export function texto(v: unknown, max = 500): string {
  if (v === null || v === undefined) return '';
  const t = String(v)
    .replace(/\r\n|\r|\n|\t/g, ' ')
    .replace(/\\/g, ' ')
    .replace(/"/g, "'")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/=+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return t.length > max ? t.substring(0, max).trim() : t;
}

export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

export function limpiarSku(v: unknown): string {
  return String(v ?? '').replace(/["\\\r\n\t]/g, '').trim();
}

export function slugify(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Codigo base: el SKU sin el sufijo *X (12345*I -> 12345). El sufijo "*/" no se quita
// hasta que la Repuestera defina que significa.
export function codigoBase(sku: unknown): string {
  return String(sku ?? '').replace(/\*[A-Z0-9]+$/i, '').trim().toUpperCase();
}

export function normNombre(s: unknown): string {
  return String(s ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
}

export function parseExcluidos(texto: string | null | undefined): Set<string> {
  return new Set(
    String(texto || '')
      .split(/[\s,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );
}

export function normalizarErp(paginas: ErpPagina[]) {
  const productos: ProductoErp[] = [];
  const vistos = new Set<string>();
  let duplicados = 0;
  let sinSku = 0;

  for (const pagina of paginas) {
    const datos = Array.isArray(pagina?.datos) ? pagina.datos : [];
    for (const d of datos) {
      const sku = limpiarSku(d?.codigo);
      if (!sku) { sinSku++; continue; }
      const clave = sku.toUpperCase();
      if (vistos.has(clave)) { duplicados++; continue; }
      vistos.add(clave);

      const p = d.infoPrecios || {};
      const precios: Precios = {};
      for (const k of PRECIOS_KEYS) precios[k] = Math.max(0, num(p[k]));

      const clase = texto(d.clase, 100);
      productos.push({
        sku,
        clave,
        nombre: texto(d.descripcion, 200) || sku,
        descCorta: texto(d.descadicional, 500),
        descLarga: texto(d.descWeb, 1000) || 'sin descripcion',
        costo: Math.max(0, num(d.costo_unitario)),
        stock: num(d.stock),
        clase,
        claseSlug: slugify(clase),
        grupo: texto(d.grupo, 100),
        subgrupo: texto(d.subgrupo, 100),
        subgrupo2: texto(d.subgrupo2, 100),
        contable: texto(d.contable, 100),
        iva: num(d.porcentaje_iva),
        precios,
      });
    }
  }

  return { productos, duplicados, sinSku, paginas: paginas.length };
}

/**
 * El catalogo solo se acepta si llegaron todas las paginas y la cantidad de registros
 * coincide con totalRegistros. Si no, es un error de lectura (nuestro) y se reintenta.
 */
export function validarCatalogo(paginas: ErpPagina[]): string | null {
  if (paginas.length === 0) return 'El ERP no devolvio paginas';
  const primera = paginas[0];
  const totalPaginas = Number(primera.totalPaginas);
  const totalRegistros = Number(primera.totalRegistros);
  if (!Number.isFinite(totalPaginas) || !Number.isFinite(totalRegistros)) {
    return 'El ERP no reporto totalPaginas/totalRegistros';
  }
  const ultima = paginas[paginas.length - 1];
  if (Number(ultima.paginaActual) < totalPaginas) {
    return `Paginacion incompleta: llego hasta la pagina ${ultima.paginaActual} de ${totalPaginas}`;
  }
  const recibidos = paginas.reduce((acc, p) => acc + (Array.isArray(p.datos) ? p.datos.length : 0), 0);
  if (recibidos !== totalRegistros) {
    return `Catalogo incompleto: llegaron ${recibidos} registros y el ERP reporta ${totalRegistros}`;
  }
  if (totalRegistros === 0) return 'El ERP devolvio 0 productos';
  return null;
}

/**
 * Proteccion contra caidas del ERP. Compara contra el total de la ultima corrida buena;
 * en la primera corrida, contra los productos visibles de la tienda.
 * Los productos ocultos no cuentan: son referencias que ya salieron del ERP.
 */
export function evaluarCaida(totalErp: number, base: number, minRatio: number) {
  if (totalErp <= 0) return { ok: false, ratio: 0, base, motivo: 'El ERP devolvio 0 productos' };
  if (!base || base <= 0) return { ok: true, ratio: 1, base, motivo: null };
  const ratio = totalErp / base;
  if (ratio < minRatio) {
    return {
      ok: false,
      ratio,
      base,
      motivo: `El ERP trajo ${totalErp} productos, ${Math.round(ratio * 100)}% de la referencia (${base}). Minimo ${Math.round(minRatio * 100)}%.`,
    };
  }
  return { ok: true, ratio, base, motivo: null };
}

// ---------------------------------------------------------------- plan

const metaWoo = (w: WooProducto, k: string): unknown => {
  const m = (w.meta_data || []).find((x) => x.key === k);
  return m === undefined ? '' : m.value;
};

export function metasDe(p: ProductoErp): WooMeta[] {
  return [
    ...PRECIOS_KEYS.map((k) => ({ key: k, value: String(p.precios[k]) })),
    { key: 'clase', value: p.clase },
    { key: 'grupo', value: p.grupo },
    { key: 'sub_grupo', value: p.subgrupo },
    { key: 'sub_grupo_2', value: p.subgrupo2 },
    { key: 'contable', value: p.contable },
    { key: 'porcentaje_iva', value: String(p.iva) },
  ];
}

export function detectarCambios(p: ProductoErp, w: WooProducto): Cambio[] {
  const cambios: Cambio[] = [];
  const agregar = (campo: string, anterior: unknown, nuevo: unknown) => {
    if (String(anterior) !== String(nuevo)) cambios.push({ campo: NOMBRE_CAMPO[campo] || campo, anterior, nuevo });
  };
  agregar('stock', num(w.stock_quantity), p.stock);
  for (const k of PRECIOS_KEYS) agregar(k, num(metaWoo(w, k)), p.precios[k]);
  agregar('clase', String(metaWoo(w, 'clase')).trim(), p.clase);
  agregar('grupo', String(metaWoo(w, 'grupo')).trim(), p.grupo);
  agregar('subgrupo', String(metaWoo(w, 'sub_grupo')).trim(), p.subgrupo);
  agregar('subgrupo2', String(metaWoo(w, 'sub_grupo_2')).trim(), p.subgrupo2);
  agregar('contable', String(metaWoo(w, 'contable')).trim(), p.contable);
  agregar('iva', num(metaWoo(w, 'porcentaje_iva')), p.iva);
  if (w.manage_stock !== true) cambios.push({ campo: NOMBRE_CAMPO.manage_stock, anterior: false, nuevo: true });
  return cambios;
}

/** Clases del ERP sin categoria con el mismo slug, listas para /products/categories/batch. */
export function categoriasFaltantes(productos: ProductoErp[], categorias: WooCategoria[], max = 100) {
  const existentes = new Set(categorias.map((c) => String(c.slug || '').toLowerCase()).filter(Boolean));
  const faltantes = new Map<string, { name: string; slug: string }>();
  for (const p of productos) {
    if (!p.claseSlug || existentes.has(p.claseSlug) || faltantes.has(p.claseSlug)) continue;
    faltantes.set(p.claseSlug, { name: p.clase || p.claseSlug, slug: p.claseSlug });
  }
  return Array.from(faltantes.values()).slice(0, max);
}

export interface PlanInput {
  productos: ProductoErp[];
  woo: WooProducto[];
  categorias: WooCategoria[];
  excluidos: Set<string>;
  tamanoLote?: number;
  maxHuerfanos?: number;
  ocultarHuerfanos?: boolean;
}

export function construirPlan(input: PlanInput) {
  const TAM = Math.max(1, Math.min(100, Number(input.tamanoLote) || 50));
  const MAX_HUERFANOS = Number(input.maxHuerfanos) || 300;
  const OCULTAR = input.ocultarHuerfanos !== false;
  const EXCLUIDOS = input.excluidos;
  const { productos } = input;

  const indice = new Map<string, WooProducto>();
  for (const w of input.woo) {
    const sku = String(w?.sku ?? '').trim();
    if (sku) indice.set(sku.toUpperCase(), w);
  }

  const categorias = new Map<string, number>();
  for (const c of input.categorias) {
    if (c?.slug && c?.id) categorias.set(String(c.slug).toLowerCase(), c.id);
  }

  // Huerfanos: en la tienda pero ya no vienen del ERP
  const clavesErp = new Set(productos.map((p) => p.clave));
  const huerfanosTodos: WooProducto[] = [];
  for (const [clave, w] of Array.from(indice.entries())) if (!clavesErp.has(clave)) huerfanosTodos.push(w);
  const huerfanosActivos = huerfanosTodos.filter(
    (w) => !EXCLUIDOS.has(String(w.sku || '').toUpperCase()) &&
      (num(w.stock_quantity) > 0 || (!!w.catalog_visibility && w.catalog_visibility !== 'hidden'))
  );
  const procesarHuerfanos = OCULTAR && huerfanosActivos.length <= MAX_HUERFANOS;

  const huerfanoPorBase = new Map<string, WooProducto>();
  const huerfanoPorNombre = new Map<string, WooProducto>();
  for (const w of huerfanosTodos) {
    const b = codigoBase(w.sku);
    if (!huerfanoPorBase.has(b)) huerfanoPorBase.set(b, w);
    const n = normNombre(w.name);
    if (n && !huerfanoPorNombre.has(n)) huerfanoPorNombre.set(n, w);
  }

  const crear: Record<string, unknown>[] = [];
  const detalleCrear: DetalleCrear[] = [];
  const actualizar: Record<string, unknown>[] = [];
  const detalleActualizar: DetalleActualizar[] = [];
  const emparejados: { sku_nuevo: string; sku_anterior: string; nombre: string }[] = [];
  const reaparecidos: string[] = [];
  const erroresPlan: ErrorMuestra[] = [];
  let sinCambios = 0;
  let excluidosIgnorados = 0;

  for (const p of productos) {
    if (EXCLUIDOS.has(p.clave)) { excluidosIgnorados++; continue; }

    const w = indice.get(p.clave);
    const catId = p.claseSlug ? categorias.get(p.claseSlug) : undefined;

    if (!w) {
      const nuevo: Record<string, unknown> = {
        name: p.nombre,
        sku: p.sku,
        type: 'simple',
        status: 'publish',
        regular_price: String(p.costo),
        short_description: p.descCorta,
        description: p.descLarga,
        manage_stock: true,
        stock_quantity: p.stock,
        meta_data: [...metasDe(p), { key: 'producto_importado', value: 'si' }],
      };
      const viejo = huerfanoPorBase.get(codigoBase(p.sku)) || huerfanoPorNombre.get(normNombre(p.nombre));
      if (viejo && String(viejo.sku).toUpperCase() !== p.clave) {
        (nuevo.meta_data as WooMeta[]).push({ key: 'codigo_anterior', value: String(viejo.sku) });
        const img = Array.isArray(viejo.images) ? viejo.images[0]?.id : undefined;
        if (img) nuevo.images = [{ id: img }];
        emparejados.push({ sku_nuevo: p.sku, sku_anterior: String(viejo.sku), nombre: p.nombre });
      }
      if (catId) nuevo.categories = [{ id: catId }];
      else erroresPlan.push(errorCategoria('create', p));
      crear.push(nuevo);
      detalleCrear.push({ sku: p.sku, nombre: p.nombre });
      continue;
    }

    const oculto = w.catalog_visibility === 'hidden';
    const campos = detectarCambios(p, w);
    if (!oculto && campos.length === 0) { sinCambios++; continue; }

    const cambio: Record<string, unknown> = {
      id: w.id,
      manage_stock: true,
      stock_quantity: p.stock,
      meta_data: metasDe(p),
      regular_price: String(p.costo),
    };
    if (oculto) {
      cambio.catalog_visibility = 'visible';
      campos.push({ campo: 'Visibilidad', anterior: 'oculto', nuevo: 'visible (volvio al ERP)' });
      reaparecidos.push(p.sku);
    }
    if (catId) cambio.categories = [{ id: catId }];
    else erroresPlan.push(errorCategoria('update', p));
    actualizar.push(cambio);
    detalleActualizar.push({ sku: p.sku, nombre: p.nombre, campos });
  }

  // Excluidos publicados -> borrador. Los que estan en la papelera no llegan aqui (status=any no los trae).
  const bajados: string[] = [];
  for (const [clave, w] of Array.from(indice.entries())) {
    if (!EXCLUIDOS.has(clave)) continue;
    const estado = String(w.status || '');
    if (!estado || estado === 'draft' || estado === 'trash') continue;
    actualizar.push({ id: w.id, status: 'draft' });
    detalleActualizar.push({
      sku: String(w.sku),
      nombre: String(w.name || ''),
      campos: [{ campo: 'Estado', anterior: estado, nuevo: 'borrador (referencia excluida)' }],
    });
    bajados.push(String(w.sku));
  }

  const ocultados: string[] = [];
  if (procesarHuerfanos) {
    for (const w of huerfanosActivos) {
      actualizar.push({ id: w.id, manage_stock: true, stock_quantity: 0, catalog_visibility: 'hidden' });
      detalleActualizar.push({
        sku: String(w.sku),
        nombre: String(w.name || ''),
        campos: [{ campo: 'Huerfano (ya no esta en ERP)', anterior: 'visible', nuevo: 'oculto / stock 0' }],
      });
      ocultados.push(String(w.sku));
    }
  }

  // Lotes mezclando creaciones y actualizaciones, como el workflow original
  const lotes: Lote[] = [];
  let i = 0;
  let j = 0;
  while (i < crear.length || j < actualizar.length) {
    const c = crear.slice(i, i + TAM);
    const dc = detalleCrear.slice(i, i + TAM);
    i += c.length;
    const espacio = TAM - c.length;
    const u = espacio > 0 ? actualizar.slice(j, j + espacio) : [];
    const du = espacio > 0 ? detalleActualizar.slice(j, j + espacio) : [];
    j += u.length;
    lotes.push({ create: c, update: u, detalleCrear: dc, detalleActualizar: du });
  }

  const stats = {
    total_erp: productos.length,
    existentes_en_woo: indice.size,
    a_crear: crear.length,
    a_actualizar: actualizar.length,
    sin_cambios: sinCambios,
    total_lotes: lotes.length,
    tamano_lote: TAM,
    huerfanos_detectados: huerfanosTodos.length,
    huerfanos_visibles_o_con_stock: huerfanosActivos.length,
    huerfanos_ocultados: ocultados.length,
    motivo_no_ocultar: procesarHuerfanos
      ? null
      : !OCULTAR
        ? 'ocultar huerfanos desactivado'
        : `mas de ${MAX_HUERFANOS} huerfanos (revisar a mano)`,
    reaparecidos_visibles: reaparecidos.slice(0, 200),
    emparejados_codigo_anterior: emparejados.slice(0, 200),
    excluidos_configurados: EXCLUIDOS.size,
    excluidos_ignorados_del_erp: excluidosIgnorados,
    excluidos_pasados_a_borrador: bajados,
    sin_categoria: erroresPlan.length,
  };

  return { lotes, stats, erroresPlan, ocultados, huerfanosActivos: huerfanosActivos.length };
}

function errorCategoria(tipo: 'create' | 'update', p: ProductoErp): ErrorMuestra {
  return {
    tipo: 'categoria',
    sku: p.sku,
    code: p.clase ? 'categoria_inexistente' : 'clase_vacia',
    mensaje: p.clase
      ? `No existe categoria para la clase "${p.clase}" (slug ${p.claseSlug}); ${tipo === 'create' ? 'se crea sin categoria' : 'se conserva la categoria actual'}`
      : `El ERP no trae clase; ${tipo === 'create' ? 'se crea sin categoria' : 'se conserva la categoria actual'}`,
  };
}

// ---------------------------------------------------------------- resultado

export const LIMITE_LISTADO = 500;
export const LIMITE_ERRORES = 20;

interface RespuestaBatchItem {
  id?: number;
  sku?: string;
  name?: string;
  error?: { code?: string; message?: string; data?: { resource_id?: unknown } };
}

export interface RespuestaLote {
  ok: boolean;
  error?: string;
  body?: { create?: RespuestaBatchItem[]; update?: RespuestaBatchItem[] };
}

/** Cuenta el resultado real de cada lote. WooCommerce responde un objeto por producto. */
export function consolidarLotes(lotes: Lote[], respuestas: RespuestaLote[], erroresPrevios: ErrorMuestra[] = []) {
  let creados = 0;
  let actualizados = 0;
  let errores = erroresPrevios.length;
  const errorSamples: ErrorMuestra[] = erroresPrevios.slice(0, LIMITE_ERRORES);
  const createdProducts: DetalleCrear[] = [];
  const updatedProducts: { sku: string; nombre: string; cambios: Cambio[] }[] = [];
  const fallidos: { sku: string | null; tipo: string; mensaje: string }[] = [];
  const muestra = (e: ErrorMuestra) => { if (errorSamples.length < LIMITE_ERRORES) errorSamples.push(e); };

  respuestas.forEach((r, idx) => {
    const plan = lotes[idx];
    if (!r.ok) {
      const n = (plan?.create.length || 0) + (plan?.update.length || 0);
      errores += n || 1;
      muestra({ tipo: 'request', sku: null, code: null, mensaje: String(r.error || 'Fallo el lote').substring(0, 300) });
      fallidos.push({ sku: null, tipo: 'request', mensaje: `Lote ${idx + 1} fallo completo (${n} productos): ${r.error}` });
      return;
    }
    const body = r.body || {};
    (body.create || []).forEach((item, i) => {
      const info = plan?.detalleCrear[i];
      if (item?.error) {
        errores++;
        const sku = info?.sku ?? (item.error.data?.resource_id != null ? String(item.error.data.resource_id) : null);
        muestra({ tipo: 'create', sku, code: item.error.code ?? null, mensaje: String(item.error.message || '').substring(0, 300) });
        fallidos.push({ sku, tipo: 'create', mensaje: String(item.error.message || '') });
        return;
      }
      creados++;
      if (createdProducts.length < LIMITE_LISTADO) {
        createdProducts.push({ sku: item.sku ?? info?.sku ?? '', nombre: item.name ?? info?.nombre ?? '' });
      }
    });
    (body.update || []).forEach((item, i) => {
      const info = plan?.detalleActualizar[i];
      if (item?.error) {
        errores++;
        const sku = info?.sku ?? null;
        muestra({ tipo: 'update', sku, code: item.error.code ?? null, mensaje: String(item.error.message || '').substring(0, 300) });
        fallidos.push({ sku, tipo: 'update', mensaje: String(item.error.message || '') });
        return;
      }
      actualizados++;
      if (updatedProducts.length < LIMITE_LISTADO) {
        updatedProducts.push({ sku: item.sku ?? info?.sku ?? '', nombre: item.name ?? info?.nombre ?? '', cambios: info?.campos || [] });
      }
    });
  });

  return { creados, actualizados, errores, errorSamples, createdProducts, updatedProducts, fallidos };
}

/** Fecha en hora de Colombia (UTC-5, sin horario de verano) con el formato que usa el plugin. */
export function horaColombia(d: Date): string {
  const co = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return co.toISOString().replace('T', ' ').substring(0, 19);
}

export interface CallbackInput {
  status: 'done' | 'done_with_errors' | 'error';
  mensaje?: string | null;
  totalErp: number;
  creados: number;
  actualizados: number;
  sinCambios: number;
  errores: number;
  errorSamples: ErrorMuestra[];
  createdProducts: DetalleCrear[];
  updatedProducts: { sku: string; nombre: string; cambios: Cambio[] }[];
  inicio: Date;
  fin: Date;
  lotes: number;
  tamanoLote: number;
}

export function construirCallback(c: CallbackInput) {
  return {
    status: c.status,
    ...(c.mensaje ? { message: c.mensaje } : {}),
    sync: {
      total_products: c.totalErp,
      processed: c.creados + c.actualizados,
      created: c.creados,
      updated: c.actualizados,
      skipped: c.sinCambios,
      pending: 0,
      errors: c.errores,
      error_samples: c.errorSamples.slice(0, LIMITE_ERRORES),
      created_products: c.createdProducts.slice(0, LIMITE_LISTADO),
      updated_products: c.updatedProducts.slice(0, LIMITE_LISTADO),
    },
    execution: {
      started_at: horaColombia(c.inicio),
      finished_at: horaColombia(c.fin),
      duration_seconds: Math.max(0, Math.round((c.fin.getTime() - c.inicio.getTime()) / 1000)),
      batches: c.lotes,
      batch_size: c.tamanoLote,
    },
    source: { system: 'ERP Repuestera', destination: 'WordPress/WooCommerce' },
  };
}

/** Filas de "Ver todos los precios": una por producto con SKU, sacadas de las metas. */
export function filasPrecios(woo: WooProducto[]) {
  const filas: Record<string, unknown>[] = [];
  for (const p of woo) {
    const sku = String(p?.sku ?? '').trim();
    if (!sku) continue;
    const fila: Record<string, unknown> = { sku };
    for (const k of PRECIOS_KEYS) {
      const m = (p.meta_data || []).find((x) => x.key === k);
      fila[k] = m ? m.value : null;
    }
    filas.push(fila);
  }
  return filas;
}

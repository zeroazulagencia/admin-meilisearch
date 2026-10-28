import { query } from '@/utils/db';

const TABLE = 'modulos_precios_dinamicos_ubicacion_shopify_30_pedidos_log';
const RETENCION_DIAS = 5;
const PURGA_CADA_MS = 60 * 60 * 1000; // como mucho una purga por hora y proceso

export type ResultadoPedido = 'draft_creado' | 'sin_descuento' | 'dry_run' | 'rechazado' | 'error';

export interface EntradaPedido {
  http_status: number;
  resultado: ResultadoPedido;
  error?: string | null;
  ip?: string | null;
  origin?: string | null;
  user_agent?: string | null;
  fuente?: string | null;
  ciudad?: string | null;
  region?: string | null;
  regla?: string | null;
  descuento?: number | null;
  items?: unknown;
  lineas?: unknown;
  draft_order_id?: number | null;
  duracion_ms?: number | null;
}

let ultimaPurga = 0;

async function purgar(forzar = false): Promise<void> {
  if (!forzar && Date.now() - ultimaPurga < PURGA_CADA_MS) return;
  ultimaPurga = Date.now();
  await query(`DELETE FROM ${TABLE} WHERE created_at < NOW() - INTERVAL ${RETENCION_DIAS} DAY`);
}

const corto = (v: unknown, max: number) => (v == null ? null : String(v).slice(0, max));
const json = (v: unknown) => (v == null ? null : JSON.stringify(v).slice(0, 8000));

/** Registra una solicitud de pedido. Nunca lanza: el log no debe tumbar el checkout. */
export async function registrarPedido(e: EntradaPedido): Promise<void> {
  try {
    await query(
      `INSERT INTO ${TABLE}
        (http_status, resultado, error, ip, origin, user_agent, fuente, ciudad, region, regla, descuento, items, lineas, draft_order_id, duracion_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.http_status,
        e.resultado,
        corto(e.error, 255),
        corto(e.ip, 64),
        corto(e.origin, 255),
        corto(e.user_agent, 255),
        corto(e.fuente, 10),
        corto(e.ciudad, 120),
        corto(e.region, 120),
        corto(e.regla, 120),
        e.descuento ?? null,
        json(e.items),
        json(e.lineas),
        e.draft_order_id ?? null,
        e.duracion_ms ?? null,
      ]
    );
    await purgar();
  } catch (err) {
    console.error('[pedidos-log] no se pudo registrar:', err);
  }
}

/** Últimas solicitudes (solo dentro de la ventana de retención). */
export async function listarPedidos(limite = 200): Promise<any[]> {
  await purgar(true);
  const n = Math.min(Math.max(Math.trunc(limite) || 200, 1), 1000);
  const [rows] = await query(
    `SELECT * FROM ${TABLE} WHERE created_at >= NOW() - INTERVAL ${RETENCION_DIAS} DAY ORDER BY id DESC LIMIT ${n}`
  );
  return rows.map((r: any) => ({
    ...r,
    items: r.items ? JSON.parse(r.items) : null,
    lineas: r.lineas ? JSON.parse(r.lineas) : null,
  }));
}

import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/config';
import { secretoValido, tokenDePlugin } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/auth';
import { wooProductos, errorTexto } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/clientes';
import { filasPrecios } from '@/utils/modulos/sincronizador-repuestos-repuestera-31/plan';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Boton "Ver todos los precios" del plugin: una fila por producto {sku, precio_1..precio_10}
 * sacada de las metas de WooCommerce. Equivale a /webhook/productos de n8n.
 */
async function handler(request: NextRequest) {
  try {
    const cfg = await getRuntimeConfig();
    if (!secretoValido(tokenDePlugin(request), cfg.syncToken)) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }
    const productos = await wooProductos(
      { baseUrl: cfg.wooBaseUrl, key: cfg.wooKey, secret: cfg.wooSecret },
      { intentos: 2, esperaMs: 2000, timeoutMs: 30000 },
      'id,sku,meta_data'
    );
    return NextResponse.json(filasPrecios(productos));
  } catch (error) {
    console.error('[API MOD31 PRECIOS]', errorTexto(error));
    return NextResponse.json({ ok: false, error: 'No se pudieron leer los precios' }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;

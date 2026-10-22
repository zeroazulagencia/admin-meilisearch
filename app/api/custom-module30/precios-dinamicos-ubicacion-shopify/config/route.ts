import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { getAllConfig, setConfig } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const config = await getAllConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();

    const upserts: Array<Promise<void>> = [];

    if (body.shopify_shop_domain != null) upserts.push(setConfig('shopify_shop_domain', String(body.shopify_shop_domain || '').trim() || null));
    if (body.shopify_admin_access_token != null) upserts.push(setConfig('shopify_admin_access_token', String(body.shopify_admin_access_token || '').trim() || null));
    if (body.shopify_api_key != null) upserts.push(setConfig('shopify_api_key', String(body.shopify_api_key || '').trim() || null));
    if (body.shopify_api_secret != null) upserts.push(setConfig('shopify_api_secret', String(body.shopify_api_secret || '').trim() || null));
    if (body.shopify_webhook_secret != null) upserts.push(setConfig('shopify_webhook_secret', String(body.shopify_webhook_secret || '').trim() || null));
    if (body.shopify_bridge_secret != null) upserts.push(setConfig('shopify_bridge_secret', String(body.shopify_bridge_secret || '').trim() || null));
    if (body.shopify_storefront_access_token != null) upserts.push(setConfig('shopify_storefront_access_token', String(body.shopify_storefront_access_token || '').trim() || null));
    if (body.shopify_app_name != null) upserts.push(setConfig('shopify_app_name', String(body.shopify_app_name || '').trim() || null));

    await Promise.all(upserts);

    const config = await getAllConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}
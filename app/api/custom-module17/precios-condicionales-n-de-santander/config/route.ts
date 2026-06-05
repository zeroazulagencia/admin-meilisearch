import { NextRequest, NextResponse } from 'next/server';
import {
  getAllConfig,
  getProductOverrides,
  setConfig,
  setProductOverrides,
} from '@/utils/modulos/precios-condicionales-17/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [config, productOverrides] = await Promise.all([
      getAllConfig(),
      getProductOverrides(),
    ]);
    return NextResponse.json({ ok: true, config, product_overrides: productOverrides });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const upserts: Array<Promise<void>> = [];
    let normalizedProductOverrides;

    if (body.enabled != null) upserts.push(setConfig('enabled', body.enabled ? '1' : '0'));
    if (body.target_country_code != null) upserts.push(setConfig('target_country_code', String(body.target_country_code || '').toUpperCase().trim() || null));
    if (body.target_state != null) upserts.push(setConfig('target_state', String(body.target_state || '').trim() || null));
    if (body.discount_type != null) upserts.push(setConfig('discount_type', String(body.discount_type || '').trim() || null));
    if (body.discount_value != null) upserts.push(setConfig('discount_value', String(body.discount_value)));
    if (body.require_shipping_match != null) upserts.push(setConfig('require_shipping_match', body.require_shipping_match ? '1' : '0'));
    if (body.product_scope_mode != null) upserts.push(setConfig('product_scope_mode', String(body.product_scope_mode || '').trim() || null));

    if (body.state_aliases != null) {
      const aliases = Array.isArray(body.state_aliases)
        ? JSON.stringify(body.state_aliases.map((v: any) => String(v || '').trim()).filter(Boolean))
        : String(body.state_aliases || '').trim();
      upserts.push(setConfig('state_aliases', aliases || null));
    }

    if (body.state_discounts != null) {
      const normalized = Array.isArray(body.state_discounts)
        ? JSON.stringify(
            body.state_discounts
              .map((item: any) => ({
                state: String(item?.state || '').trim(),
                discount: Number(item?.discount || 0),
              }))
              .filter((item: any) => item.state && Number.isFinite(item.discount) && item.discount >= 0)
          )
        : '[]';
      upserts.push(setConfig('state_discounts', normalized));
    }

    if (body.ipwhois_base_url != null) upserts.push(setConfig('ipwhois_base_url', String(body.ipwhois_base_url || '').trim() || null));

    if (body.shopify_shop_domain != null) upserts.push(setConfig('shopify_shop_domain', String(body.shopify_shop_domain || '').trim() || null));
    if (body.shopify_admin_access_token != null) upserts.push(setConfig('shopify_admin_access_token', String(body.shopify_admin_access_token || '').trim() || null));
    if (body.shopify_api_key != null) upserts.push(setConfig('shopify_api_key', String(body.shopify_api_key || '').trim() || null));
    if (body.shopify_api_secret != null) upserts.push(setConfig('shopify_api_secret', String(body.shopify_api_secret || '').trim() || null));
    if (body.shopify_webhook_secret != null) upserts.push(setConfig('shopify_webhook_secret', String(body.shopify_webhook_secret || '').trim() || null));
    if (body.shopify_bridge_secret != null) upserts.push(setConfig('shopify_bridge_secret', String(body.shopify_bridge_secret || '').trim() || null));
    if (body.shopify_storefront_access_token != null) upserts.push(setConfig('shopify_storefront_access_token', String(body.shopify_storefront_access_token || '').trim() || null));

    if (body.product_overrides !== undefined) {
      normalizedProductOverrides = await setProductOverrides(Array.isArray(body.product_overrides) ? body.product_overrides : []);
    }

    await Promise.all(upserts);

    // Sincronizar con app externa de price rules
    if (body.state_discounts != null) {
      try {
        const extUrl = process.env.ZA_PRICE_RULES_APP_URL || 'http://localhost:9002';
        const getRes = await fetch(`${extUrl}/api/za-config`, { cache: 'no-store' });
        if (getRes.ok) {
          const extConfig = await getRes.json();
          const syncBody: Record<string, any> = {
            region_state: body.state_discounts.map((item: any) => String(item.state || '').trim()).filter(Boolean),
            region_country_code: body.target_country_code || extConfig.region_country_code || 'CO',
            discount_percentage: body.state_discounts.length > 0 ? Number(body.state_discounts[0].discount || 0) : (extConfig.discount_percentage || 10),
            state_discounts: body.state_discounts,
            scope: extConfig.scope || 'all',
            scope_target_ids: extConfig.scope_target_ids || [],
            active: body.enabled != null ? (body.enabled === true || body.enabled === 1 || body.enabled === '1') : (extConfig.active !== false),
          };
          // Limpiar undefined
          Object.keys(syncBody).forEach(k => syncBody[k] === undefined && delete syncBody[k]);
          const synced = await fetch(`${extUrl}/api/za-config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncBody),
          });
          if (!synced.ok) {
            const errText = await synced.text().catch(() => 'unknown');
            console.error('[Config Sync] Error al sincronizar con app externa:', synced.status, errText.slice(0, 200));
          } else {
            console.log('[Config Sync] Sincronizado exitosamente con app externa: state_discounts, region_state, discount_percentage');
          }
        } else {
          console.warn('[Config Sync] No se pudo obtener config de app externa:', getRes.status);
        }
      } catch (syncError: any) {
        console.error('[Config Sync] Error de conexión con app externa:', syncError?.message || syncError);
      }
    }

    return NextResponse.json({ ok: true, product_overrides: normalizedProductOverrides });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al guardar configuración' }, { status: 500 });
  }
}

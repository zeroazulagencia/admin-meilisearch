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

    if (body.excluded_states != null) {
      const normalized = Array.isArray(body.excluded_states)
        ? JSON.stringify(body.excluded_states.map((v: any) => String(v || '').trim()).filter(Boolean))
        : '[]';
      upserts.push(setConfig('excluded_states', normalized));
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

    // Sincronizar con app externa de price rules (SIEMPRE, no solo cuando cambia state_discounts)
    const extUrl = process.env.ZA_PRICE_RULES_APP_URL || 'http://localhost:9002';

    // Obtener config actual completa (lo que vino en el body + lo que ya estaba en BD)
    const currentConfig = await getAllConfig();

    const finalEnabled = body.enabled != null
      ? (body.enabled === true || body.enabled === 1 || body.enabled === '1')
      : (currentConfig.enabled === '1' || currentConfig.enabled === 'true');

    const finalTargetState = body.target_state != null
      ? String(body.target_state || '').trim()
      : String(currentConfig.target_state || 'Antioquia').trim();

    const finalCountryCode = body.target_country_code != null
      ? String(body.target_country_code || '').toUpperCase().trim()
      : String(currentConfig.target_country_code || 'CO').toUpperCase().trim();

    const finalDiscountValue = body.discount_value != null
      ? Number(body.discount_value)
      : Number(currentConfig.discount_value || 0);

    const finalStateDiscounts = body.state_discounts != null
      ? body.state_discounts
      : (() => {
          try { const v = JSON.parse(currentConfig.state_discounts || '[]'); return Array.isArray(v) && v.length > 0 ? v : null; } catch { return null; }
        })();

    const finalExcludedStates = body.excluded_states != null
      ? (Array.isArray(body.excluded_states) ? body.excluded_states : [])
      : (() => {
          try { const v = JSON.parse(currentConfig.excluded_states || '[]'); return Array.isArray(v) && v.length > 0 ? v : null; } catch { return null; }
        })();

    const syncBody: Record<string, any> = {
      region_state: [finalTargetState],
      region_country_code: finalCountryCode,
      discount_percentage: finalDiscountValue,
      scope: 'all',
      scope_target_ids: [],
      active: finalEnabled,
    };
    // Solo incluir state_discounts y excluded_states si tienen datos
    if (finalStateDiscounts) syncBody.state_discounts = finalStateDiscounts;
    if (finalExcludedStates) syncBody.excluded_states = finalExcludedStates;

    let syncStatus: string = 'ok';
    let syncSent: any = null;
    let syncResponse: any = null;
    try {
      const synced = await fetch(`${extUrl}/api/za-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncBody),
      });
      syncSent = syncBody;
      if (!synced.ok) {
        const errText = await synced.text().catch(() => 'unknown');
        console.error('[Config Sync] Error al sincronizar con app externa:', synced.status, errText.slice(0, 200));
        syncStatus = `error: App Shopify respondió ${synced.status}`;
        syncResponse = { status: synced.status, body: errText.slice(0, 500) };
      } else {
        console.log('[Config Sync] Sincronizado exitosamente con app externa');
        syncResponse = await synced.json().catch(() => ({ raw: 'ok' }));
      }
    } catch (syncError: any) {
      console.error('[Config Sync] Error de conexión con app externa:', syncError?.message || syncError);
      syncStatus = `error: ${syncError?.message || 'Error de conexión'}`;
      syncResponse = { error: syncError?.message };
    }

    // Verificar config final en App Shopify
    let verifyResult: any = null;
    try {
      const verifyRes = await fetch(`${extUrl}/api/za-config`, { cache: 'no-store' });
      if (verifyRes.ok) verifyResult = await verifyRes.json();
    } catch {}

    return NextResponse.json({
      ok: true,
      sync: syncStatus,
      sync_sent: syncSent,
      sync_response: syncResponse,
      shopify_actual: verifyResult ? {
        active: verifyResult.active,
        discount_percentage: verifyResult.discount_percentage,
        region_state: verifyResult.region_state,
        state_discounts: verifyResult.state_discounts,
        excluded_states: verifyResult.excluded_states?.length || 0,
      } : null,
      body_received: {
        enabled: body.enabled,
        target_state: body.target_state,
        target_country_code: body.target_country_code,
        discount_value: body.discount_value,
        state_discounts: body.state_discounts,
        excluded_states: Array.isArray(body.excluded_states) ? body.excluded_states?.length : body.excluded_states,
        product_scope_mode: body.product_scope_mode,
        require_shipping_match: body.require_shipping_match,
      },
      product_overrides: normalizedProductOverrides,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al guardar configuración' }, { status: 500 });
  }
}

import * as https from 'https';
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/precios-condicionales-17/config';
import { insertDecisionLog } from '@/utils/modulos/precios-condicionales-17/logs';

export const dynamic = 'force-dynamic';

type EvaluateCartLine = {
  product_id?: string;
  variant_id?: string;
  product_title?: string;
  quantity?: number;
};

type EvaluateBody = {
  ip?: string;
  shipping_state?: string;
  shipping_country_code?: string;
  cart_id?: string;
  customer_id?: string;
  product_id?: string;
  variant_id?: string;
  product_title?: string;
  lines?: EvaluateCartLine[];
};

type IpWhoisResponse = {
  success?: boolean;
  ip?: string;
  country_code?: string;
  region?: string;
  region_code?: string;
  city?: string;
  message?: string;
};

function httpGetJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';

      res.on('data', (chunk) => {
        raw += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(raw) as T);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function normalizeText(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getClientIp(req: NextRequest, bodyIp?: string): string | null {
  if (bodyIp && bodyIp.trim()) return bodyIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  return null;
}

function matchState(targetState: string, aliases: string[], inputState?: string | null): boolean {
  const input = normalizeText(inputState);
  if (!input) return false;

  const allowed = [targetState, ...aliases]
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return allowed.includes(input);
}

function normalizeLine(input: EvaluateCartLine | null | undefined): EvaluateCartLine | null {
  if (!input || typeof input !== 'object') return null;

  const productId = typeof input.product_id === 'string' ? input.product_id.trim() : '';
  const variantId = typeof input.variant_id === 'string' ? input.variant_id.trim() : '';
  const productTitle = typeof input.product_title === 'string' ? input.product_title.trim() : '';
  const quantity = Number(input.quantity || 1);

  if (!productId && !variantId && !productTitle) return null;

  return {
    product_id: productId || undefined,
    variant_id: variantId || undefined,
    product_title: productTitle || undefined,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
  };
}

function resolveCartLines(body: EvaluateBody): EvaluateCartLine[] {
  const explicitLines = Array.isArray(body.lines)
    ? body.lines.map((line) => normalizeLine(line)).filter((line): line is EvaluateCartLine => Boolean(line))
    : [];

  if (explicitLines.length) return explicitLines;

  const single = normalizeLine({
    product_id: body.product_id,
    variant_id: body.variant_id,
    product_title: body.product_title,
    quantity: 1,
  });

  return single ? [single] : [];
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as EvaluateBody;

  const config = await getRuntimeConfig();

  const ipAddress = getClientIp(request, body.ip);
  const shippingState = body.shipping_state || null;
  const shippingCountryCode = (body.shipping_country_code || '').toUpperCase() || null;
  const cartLines = resolveCartLines(body);

  if (!config.enabled) {
    const response = {
      ok: true,
      applied: false,
      reason: 'module_disabled',
      discount: null,
      discounts: [],
      geo: null,
    };

    await insertDecisionLog({
      eventType: 'evaluate',
      ipAddress,
      shippingState,
      shippingCountryCode,
      targetState: config.targetState,
      requireShippingMatch: config.requireShippingMatch,
      discountType: config.discountType,
      discountValue: config.discountValue,
      applied: false,
      reason: response.reason,
      requestPayload: body,
      responsePayload: response,
    });

    return NextResponse.json(response);
  }

  if (!ipAddress) {
    const response = {
      ok: false,
      applied: false,
      reason: 'missing_ip',
      discount: null,
      discounts: [],
      geo: null,
    };

    await insertDecisionLog({
      eventType: 'evaluate',
      ipAddress,
      shippingState,
      shippingCountryCode,
      targetState: config.targetState,
      requireShippingMatch: config.requireShippingMatch,
      discountType: config.discountType,
      discountValue: config.discountValue,
      applied: false,
      reason: response.reason,
      requestPayload: body,
      responsePayload: response,
    });

    return NextResponse.json(response, { status: 400 });
  }

  const lookupUrl = `${config.ipwhoisBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(ipAddress)}`;

  let geo: IpWhoisResponse | null = null;

  try {
    geo = await httpGetJson<IpWhoisResponse>(lookupUrl);

    if (!geo?.success) {
      const response = {
        ok: false,
        applied: false,
        reason: 'ip_lookup_failed',
        discount: null,
        discounts: [],
        geo,
      };

      await insertDecisionLog({
        eventType: 'evaluate',
        ipAddress,
        resolvedState: geo?.region || null,
        resolvedCountryCode: geo?.country_code || null,
        shippingState,
        shippingCountryCode,
        targetState: config.targetState,
        requireShippingMatch: config.requireShippingMatch,
        discountType: config.discountType,
        discountValue: config.discountValue,
        applied: false,
        reason: response.reason,
        requestPayload: body,
        responsePayload: response,
      });

      return NextResponse.json(response, { status: 502 });
    }
  } catch (error: any) {
    const response = {
      ok: false,
      applied: false,
      reason: 'ip_lookup_exception',
      error: error?.message || 'Error consultando ipwhois',
      discount: null,
      discounts: [],
      geo: null,
    };

    await insertDecisionLog({
      eventType: 'evaluate',
      ipAddress,
      shippingState,
      shippingCountryCode,
      targetState: config.targetState,
      requireShippingMatch: config.requireShippingMatch,
      discountType: config.discountType,
      discountValue: config.discountValue,
      applied: false,
      reason: response.reason,
      requestPayload: body,
      responsePayload: response,
    });

    return NextResponse.json(response, { status: 502 });
  }

  const ipStateMatches = matchState(config.targetState, config.stateAliases, geo?.region || '');
  const ipCountryMatches = normalizeText(geo?.country_code) === normalizeText(config.targetCountryCode);

  const shippingStateMatches = config.requireShippingMatch
    ? matchState(config.targetState, config.stateAliases, shippingState || '')
    : true;

  const shippingCountryMatches = config.requireShippingMatch
    ? normalizeText(shippingCountryCode) === normalizeText(config.targetCountryCode)
    : true;

  let reason = 'ok';
  let applied = false;

  if (!ipCountryMatches) reason = 'ip_country_mismatch';
  else if (!ipStateMatches) reason = 'ip_state_mismatch';
  else if (!shippingCountryMatches) reason = 'shipping_country_mismatch';
  else if (!shippingStateMatches) reason = 'shipping_state_mismatch';
  else applied = true;

  const discounts = (() => {
    if (!applied) return [] as Array<Record<string, unknown>>;

    const overridesByProductId = new Map<string, (typeof config.productOverrides)[number]>(
      config.productOverrides
        .filter((item) => item.active)
        .map((item) => [item.product_id, item])
    );

    const baseDiscount = {
      type: config.discountType,
      value: config.discountValue,
      source: 'base' as const,
    };

    if (!cartLines.length) {
      return config.productScopeMode === 'selected_only' ? [] : [baseDiscount];
    }

    const resolved: Array<Record<string, unknown>> = [];

    for (const line of cartLines) {
      const productId = String(line.product_id || line.variant_id || '').trim();
      const matchedOverride = productId ? overridesByProductId.get(productId) : null;

      if (matchedOverride) {
        resolved.push({
          product_id: matchedOverride.product_id,
          product_title: matchedOverride.product_title || line.product_title || null,
          quantity: line.quantity || 1,
          type: matchedOverride.mode === 'final_price' ? 'final_price' : 'percentage',
          value: matchedOverride.value,
          source: 'product_override',
        });
        continue;
      }

      if (config.productScopeMode === 'selected_only') {
        continue;
      }

      resolved.push({
        product_id: productId || null,
        product_title: line.product_title || null,
        quantity: line.quantity || 1,
        type: config.discountType,
        value: config.discountValue,
        source: 'base',
      });
    }

    return resolved;
  })();

  const response = {
    ok: true,
    applied: applied && (config.productScopeMode !== 'selected_only' || discounts.length > 0),
    reason: applied && config.productScopeMode === 'selected_only' && discounts.length === 0 ? 'no_selected_products_in_cart' : reason,
    discount: applied
      ? {
          type: config.discountType,
          value: config.discountValue,
          target_country_code: config.targetCountryCode,
          target_state: config.targetState,
          product_scope_mode: config.productScopeMode,
        }
      : null,
    discounts,
    geo: {
      ip: geo?.ip || ipAddress,
      country_code: geo?.country_code || null,
      region: geo?.region || null,
      region_code: geo?.region_code || null,
      city: geo?.city || null,
    },
    checks: {
      ip_country_matches: ipCountryMatches,
      ip_state_matches: ipStateMatches,
      shipping_country_matches: shippingCountryMatches,
      shipping_state_matches: shippingStateMatches,
      require_shipping_match: config.requireShippingMatch,
    },
  };

  await insertDecisionLog({
    eventType: 'evaluate',
    ipAddress,
    resolvedState: geo?.region || null,
    resolvedCountryCode: geo?.country_code || null,
    shippingState,
    shippingCountryCode,
    targetState: config.targetState,
    requireShippingMatch: config.requireShippingMatch,
    discountType: config.discountType,
    discountValue: config.discountValue,
    applied: response.applied,
    reason: response.reason,
    requestPayload: body,
    responsePayload: response,
  });

  return NextResponse.json(response);
}

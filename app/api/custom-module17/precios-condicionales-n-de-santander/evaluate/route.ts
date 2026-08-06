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
  product_handle?: string;
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

/** Estructura compartida que ambos servicios (ipwho.is, ipapi.co) pueden llenar */
type GeoResult = {
  region: string | null;
  country_code: string | null;
  city: string | null;
  ip?: string;
  region_code?: string | null;
};

async function fetchGeo(ip: string): Promise<GeoResult> {
  // 1) Intentar ipwho.is
  try {
    const data = await httpGetJson<IpWhoisResponse>(
      `https://ipwho.is/${encodeURIComponent(ip)}`
    );
    if (data?.success && data?.region) {
      return {
        ip: data.ip || ip,
        region: data.region,
        country_code: data.country_code || null,
        region_code: data.region_code || null,
        city: data.city || null,
      };
    }
  } catch {
    // fallback
  }

  // 2) Fallback a ipapi.co (retorna region aunque country no sea CO)
  try {
    const data: any = await httpGetJson<any>(
      `https://ipapi.co/${encodeURIComponent(ip)}/json/`
    );
    if (data?.region) {
      return {
        ip: data.ip || ip,
        region: data.region,
        country_code: data.country_code || data.country || null,
        region_code: data.region_code || null,
        city: data.city || null,
      };
    }
  } catch {
    // sin mas fallback
  }

  return { region: null, country_code: null, city: null };
}

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

function httpPostJson<T>(url: string, body: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);

    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw) as T);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

type ShopifyProductInfo = {
  id: string;
  title: string;
  handle: string;
  price: string;
  compareAtPrice: string | null;
  imageUrl: string | null;
};

async function fetchShopifyProductByHandle(
  shopDomain: string,
  storefrontToken: string,
  handle: string
): Promise<ShopifyProductInfo | null> {
  try {
    const query = `
      query getProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
          title
          handle
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                price
                compareAtPrice
              }
            }
          }
        }
      }
    `;

    const data = await httpPostJson<{
      data?: {
        productByHandle?: {
          id: string;
          title: string;
          handle: string;
          images: { edges: Array<{ node: { url: string; altText: string | null } }> };
          variants: { edges: Array<{ node: { id: string; price: string; compareAtPrice: string | null } }> };
        };
      };
      errors?: Array<{ message: string }>;
    }>(
      `https://${shopDomain}/api/2024-07/graphql.json`,
      { query, variables: { handle } },
      {
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      }
    );

    const product = data?.data?.productByHandle;
    if (!product) return null;

    const variant = product.variants?.edges?.[0]?.node;
    const image = product.images?.edges?.[0]?.node;

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      price: variant?.price || '0',
      compareAtPrice: variant?.compareAtPrice || null,
      imageUrl: image?.url || null,
    };
  } catch {
    return null;
  }
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
  const productHandle = body.product_handle || null;
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

  // Resolver geo por IP con fallback (ipwho.is → ipapi.co)
  let geo: GeoResult | null = null;

  try {
    geo = await fetchGeo(ipAddress);

    if (!geo?.region) {
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
      error: error?.message || 'Error consultando geoip',
      discount: null,
      discounts: [],
      geo: null,
    };

    await insertDecisionLog({
      eventType: 'evaluate',
      ipAddress,
      resolvedState: null,
      resolvedCountryCode: null,
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

  const ipCountryMatches = normalizeText(geo?.country_code) === normalizeText(config.targetCountryCode);

  const ipInStateDiscounts = config.stateDiscounts.length > 0 && !!config.stateDiscounts.find((sd) => {
    const input = normalizeText(geo?.region || '');
    const target = normalizeText(sd.state);
    return input === target;
  });

  const ipStateMatches = matchState(config.targetState, config.stateAliases, geo?.region || '')
    || ipInStateDiscounts;

  // Buscar descuento específico para el estado detectado
  const resolvedState = geo?.region || null;
  const matchedStateDiscount = config.stateDiscounts.length > 0 && resolvedState
    ? config.stateDiscounts.find((sd) => {
        const input = normalizeText(resolvedState);
        const target = normalizeText(sd.state);
        return input === target;
      })
    : null;

  // Determinar el valor de descuento efectivo según el departamento detectado
  const effectiveDiscountValue = matchedStateDiscount?.discount ?? config.discountValue;
  const effectiveDiscountType = config.discountType;

  const shippingStateMatches = config.requireShippingMatch
    ? matchState(config.targetState, config.stateAliases, shippingState || '')
    : true;

  const shippingCountryMatches = config.requireShippingMatch
    ? normalizeText(shippingCountryCode) === normalizeText(config.targetCountryCode)
    : true;

  // Verificar excluded_states: tanto el estado detectado por IP como el shipping
  const ipIsExcluded = config.excludedStates.length > 0 && resolvedState
    ? config.excludedStates.some((ex) => normalizeText(ex) === normalizeText(resolvedState))
    : false;

  const shippingIsExcluded = config.excludedStates.length > 0 && shippingState
    ? config.excludedStates.some((ex) => normalizeText(ex) === normalizeText(shippingState))
    : false;

  let reason = 'ok';
  let applied = false;

  if (!ipCountryMatches && !ipInStateDiscounts) reason = 'ip_country_mismatch';
  else if (!ipStateMatches) reason = 'ip_state_mismatch';
  else if (ipIsExcluded) reason = 'state_excluded';
  else if (!shippingCountryMatches) reason = 'shipping_country_mismatch';
  else if (!shippingStateMatches) reason = 'shipping_state_mismatch';
  else if (shippingIsExcluded) reason = 'state_excluded';
  else applied = true;

  const discounts = (() => {
    if (!applied) return [] as Array<Record<string, unknown>>;

    const overridesByProductId = new Map<string, (typeof config.productOverrides)[number]>(
      config.productOverrides
        .filter((item) => item.active)
        .map((item) => [item.product_id, item])
    );

    const effectiveDiscountValue = matchedStateDiscount?.discount ?? config.discountValue;
    const effectiveDiscountType = config.discountType;

    const baseDiscount = {
      type: effectiveDiscountType,
      value: effectiveDiscountValue,
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
        type: effectiveDiscountType,
        value: effectiveDiscountValue,
        source: 'base',
      });
    }

    return resolved;
  })();

  // Fetch producto real desde Shopify Storefront API si se proporciono un handle
  const realProduct = (productHandle && config.shopifyShopDomain && config.shopifyStorefrontAccessToken)
    ? await fetchShopifyProductByHandle(
        config.shopifyShopDomain,
        config.shopifyStorefrontAccessToken,
        productHandle
      )
    : null;

  const response = {
    ok: true,
    applied: applied && (config.productScopeMode !== 'selected_only' || discounts.length > 0),
    reason: applied && config.productScopeMode === 'selected_only' && discounts.length === 0 ? 'no_selected_products_in_cart' : reason,
    discount: applied
      ? {
          type: effectiveDiscountType,
          value: effectiveDiscountValue,
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
    product: realProduct
      ? {
          id: realProduct.id,
          title: realProduct.title,
          handle: realProduct.handle,
          image_url: realProduct.imageUrl,
          url: `https://${config.shopifyShopDomain}/products/${realProduct.handle}`,
          original_price: realProduct.price,
          compare_at_price: realProduct.compareAtPrice,
          discount_applied: applied,
          final_price: applied
            ? (() => {
                const orig = Number(realProduct.price);
                const dv = Number(effectiveDiscountValue);
                if (effectiveDiscountType === 'percentage') {
                  return String(Math.max(0, Math.round(orig * (1 - dv / 100) * 100) / 100));
                }
                return String(Math.max(0, orig - dv));
              })()
            : realProduct.price,
          savings: applied
            ? (() => {
                const orig = Number(realProduct.price);
                const dv = Number(effectiveDiscountValue);
                if (effectiveDiscountType === 'percentage') {
                  return String(Math.round(orig * dv / 100 * 100) / 100);
                }
                return String(Math.min(dv, orig));
              })()
            : '0',
        }
      : null,
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

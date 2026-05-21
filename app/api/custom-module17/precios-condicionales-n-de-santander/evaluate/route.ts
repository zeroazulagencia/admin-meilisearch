import * as https from 'https';
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/precios-condicionales-17/config';
import { insertDecisionLog } from '@/utils/modulos/precios-condicionales-17/logs';

export const dynamic = 'force-dynamic';

type EvaluateBody = {
  ip?: string;
  shipping_state?: string;
  shipping_country_code?: string;
  cart_id?: string;
  customer_id?: string;
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

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as EvaluateBody;

  const config = await getRuntimeConfig();

  const ipAddress = getClientIp(request, body.ip);
  const shippingState = body.shipping_state || null;
  const shippingCountryCode = (body.shipping_country_code || '').toUpperCase() || null;

  if (!config.enabled) {
    const response = {
      ok: true,
      applied: false,
      reason: 'module_disabled',
      discount: null,
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

  const response = {
    ok: true,
    applied,
    reason,
    discount: applied
      ? {
          type: config.discountType,
          value: config.discountValue,
          target_country_code: config.targetCountryCode,
          target_state: config.targetState,
        }
      : null,
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
    applied,
    reason,
    requestPayload: body,
    responsePayload: response,
  });

  return NextResponse.json(response);
}

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllConfig,
  setConfig,
  getProductRules,
  setProductRules,
  getDistinctProductNames,
  getDistinctGateways,
  GATEWAY_EMPTY_SENTINEL,
  FALLBACK_RULE_ERROR,
} from '@/utils/modulos/biury-pagos/module8-config';

export const dynamic = 'force-dynamic';

function maskToken(v: string | null): string | null {
  if (!v) return null;
  if (v.length <= 8) return '****';
  return v.slice(0, 4) + '****' + v.slice(-4);
}

export async function GET() {
  try {
    const [config, productRules, availableProducts, availableGateways] = await Promise.all([
      getAllConfig(),
      getProductRules(),
      getDistinctProductNames(),
      getDistinctGateways(),
    ]);
    const masked: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      if (key === 'access_key' || key === 'siigo_access_key') {
        masked[key] = maskToken(value) || '';
      } else if (key === 'siigo_username') {
        masked[key] = value || '';
      } else {
        masked[key] = value || '';
      }
    }

    const gatewaysWithFallback = [
      GATEWAY_EMPTY_SENTINEL,
      ...availableGateways.filter((gw) => gw !== GATEWAY_EMPTY_SENTINEL),
    ];

    return NextResponse.json({
      ok: true,
      config: masked,
      product_rules: productRules,
      available_products: availableProducts,
      available_gateways: gatewaysWithFallback,
      gateway_empty_value: GATEWAY_EMPTY_SENTINEL,
    });
  } catch (error: any) {
    console.error('[Biury-Config-GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  let normalizedRules;
  try {
    const body = await request.json();
    const { access_key, siigo_username, siigo_access_key, product_rules } = body;

    if (access_key !== undefined) {
      await setConfig('access_key', access_key === '' ? null : String(access_key));
    }

    if (siigo_username !== undefined) {
      await setConfig('siigo_username', siigo_username === '' ? null : String(siigo_username));
    }

    if (siigo_access_key !== undefined) {
      await setConfig('siigo_access_key', siigo_access_key === '' ? null : String(siigo_access_key));
    }

    if (product_rules !== undefined) {
      normalizedRules = await setProductRules(Array.isArray(product_rules) ? product_rules : []);
    }

    return NextResponse.json({
      ok: true,
      message: 'Configuración guardada',
      product_rules: normalizedRules,
    });
  } catch (error: any) {
    console.error('[Biury-Config-PUT] Error:', error);
    const status = error?.code === 'MISSING_FALLBACK_RULE' ? 400 : 500;
    const message = error?.code === 'MISSING_FALLBACK_RULE' ? FALLBACK_RULE_ERROR : error.message;
    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}

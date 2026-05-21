import { NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/precios-condicionales-17/config';

export const dynamic = 'force-dynamic';

async function safeJson(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    return { raw: text.slice(0, 500) };
  }
  return response.json().catch(() => ({ raw: 'invalid_json' }));
}

export async function POST() {
  try {
    const cfg = await getRuntimeConfig();
    const domain = String(cfg.shopifyShopDomain || '').trim();
    const adminToken = String(cfg.shopifyAdminAccessToken || '').trim();
    const storefrontToken = String(cfg.shopifyStorefrontAccessToken || '').trim();
    const apiKey = String(cfg.shopifyApiKey || '').trim();
    const apiSecret = String(cfg.shopifyApiSecret || '').trim();

    if (!domain) {
      return NextResponse.json({ ok: false, error: 'shopify_shop_domain no configurado' }, { status: 400 });
    }

    const result: any = {
      domain,
      admin: { configured: Boolean(adminToken) },
      storefront: { configured: Boolean(storefrontToken) },
      appKeys: {
        apiKeyConfigured: Boolean(apiKey),
        apiSecretConfigured: Boolean(apiSecret),
      },
    };

    if (adminToken) {
      const adminRes = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify({ query: '{ shop { id name myshopifyDomain } }' }),
      });

      const adminBody = await safeJson(adminRes);
      result.admin = {
        ...result.admin,
        ok: adminRes.ok,
        status: adminRes.status,
        body: adminBody,
      };
    }

    if (storefrontToken) {
      const storefrontRes = await fetch(`https://${domain}/api/2024-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({ query: '{ shop { name primaryDomain { url } } }' }),
      });

      const storefrontBody = await safeJson(storefrontRes);
      result.storefront = {
        ...result.storefront,
        ok: storefrontRes.ok,
        status: storefrontRes.status,
        body: storefrontBody,
      };
    }

    const overallOk =
      (result.admin.configured ? Boolean(result.admin.ok) : true) &&
      (result.storefront.configured ? Boolean(result.storefront.ok) : true);

    return NextResponse.json({ ok: overallOk, result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error verificando conexión Shopify' }, { status: 500 });
  }
}

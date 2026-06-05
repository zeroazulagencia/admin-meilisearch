import { NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/utils/modulos/precios-condicionales-17/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getRuntimeConfig();

    const domain = String(config.shopifyShopDomain || '').trim();
    const storefrontToken = String(config.shopifyStorefrontAccessToken || '').trim();

    if (!domain || !storefrontToken) {
      return NextResponse.json({ ok: false, error: 'Shopify no configurado' }, { status: 400 });
    }

    const gql = `{
      products(first: 5) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                }
              }
            }
          }
        }
      }
    }`;

    const res = await fetch(`https://${domain}/api/2024-07/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({ query: gql }),
    });

    const json = await res.json();

    if (json.errors) {
      return NextResponse.json({ ok: false, error: 'Error Shopify: ' + (json.errors[0]?.message || 'unknown') }, { status: 502 });
    }

    const products = (json.data?.products?.edges || []).map((edge: any) => {
      const node = edge.node;
      const variant = node.variants?.edges?.[0]?.node;
      return {
        id: node.id,
        title: node.title,
        price: variant?.price || '0.00',
        variant_id: variant?.id || null,
      };
    });

    return NextResponse.json({ ok: true, products });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error interno' }, { status: 500 });
  }
}
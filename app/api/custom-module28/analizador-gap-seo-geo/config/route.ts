/**
 * Módulo 28 - Analizador GAP SEO + GEO
 * GET: devuelve config. PUT: actualiza.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/utils/modulos/analizador-gap-seo-geo/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config: Record<string, string | null> = {
      client_url: await getConfig('client_url'),
      competitor_urls: await getConfig('competitor_urls'),
      api_key_login: await getConfig('api_key_login'),
      api_key_password: await getConfig('api_key_password'),
      api_key_base64: await getConfig('api_key_base64'),
      server_ip: await getConfig('server_ip'),
      openrouter_api_key: await getConfig('openrouter_api_key'),
    };
    return NextResponse.json({ ok: true, config });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.client_url != null)
      await setConfig('client_url', body.client_url === '' ? null : String(body.client_url));
    if (body.competitor_urls != null)
      await setConfig('competitor_urls', body.competitor_urls === '' ? null : String(body.competitor_urls));
    if (body.api_key_login != null)
      await setConfig('api_key_login', body.api_key_login === '' ? null : String(body.api_key_login));
    if (body.api_key_password != null)
      await setConfig('api_key_password', body.api_key_password === '' ? null : String(body.api_key_password));
    if (body.api_key_base64 != null)
      await setConfig('api_key_base64', body.api_key_base64 === '' ? null : String(body.api_key_base64));
    if (body.server_ip != null)
      await setConfig('server_ip', body.server_ip === '' ? null : String(body.server_ip));
    if (body.openrouter_api_key != null)
      await setConfig('openrouter_api_key', body.openrouter_api_key === '' ? null : String(body.openrouter_api_key));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
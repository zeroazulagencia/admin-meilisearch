/**
 * Módulo 28 - Test de URL
 * POST: recibe { url }, intenta fetch y devuelve status/http_code/ok
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url: string = body?.url?.trim();

    if (!url) {
      return NextResponse.json({ ok: false, error: 'URL vacía' }, { status: 400 });
    }

    let testUrl = url;
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = 'https://' + testUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const start = Date.now();
    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZeroAzul-SEO-Analyzer/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    const elapsed = Date.now() - start;

    return NextResponse.json({
      ok: response.ok,
      url: testUrl,
      status: response.status,
      statusText: response.statusText,
      ms: elapsed,
    });
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return NextResponse.json({ ok: false, error: 'Timeout (15s)', status: 0 });
    }
    return NextResponse.json({
      ok: false,
      error: e?.message || 'Error de conexión',
      status: 0,
    });
  }
}
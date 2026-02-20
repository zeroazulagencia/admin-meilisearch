import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url') ?? '';
    if (!url) {
      return NextResponse.json({ ok: false, error: 'url requerido' }, { status: 400 });
    }

    const [cfg] = await query<any>('SELECT config_key, config_value FROM modulos_sara_11_config');
    const config: Record<string, string> = Object.fromEntries(
      cfg.map((r: any) => [r.config_key, r.config_value ?? ''])
    );

    if (!config.account_sid || !config.api_key_secret) {
      return NextResponse.json({ ok: false, error: 'Credenciales no configuradas' }, { status: 500 });
    }

    const authHeader = 'Basic ' + Buffer.from(`${config.account_sid}:${config.api_key_secret}`).toString('base64');

    const response = await fetch(url, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      const authHeaderAlt = 'Basic ' + Buffer.from(`${config.api_key_sid}:${config.api_key_secret}`).toString('base64');
      const response2 = await fetch(url, {
        headers: { Authorization: authHeaderAlt },
      });
      if (!response2.ok) {
        return NextResponse.json({ ok: false, error: `Error ${response2.status}` }, { status: response2.status });
      }
      const audioBuffer = await response2.arrayBuffer();
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': response2.headers.get('Content-Type') || 'audio/mpeg',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

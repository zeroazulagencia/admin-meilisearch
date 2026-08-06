import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/utils/modulos/forocpi-exportacion-registros-23/module23-config';

export const dynamic = 'force-dynamic';

function maskToken(v: string | null): string | null {
  if (!v) return null;
  if (v.length <= 8) return '****';
  return v.slice(0, 4) + '****' + v.slice(-4);
}

export async function GET() {
  try {
    const config = await getAllConfig();
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      if (key === 'wp_app_password' || key === 'db_password') {
        masked[key] = maskToken(value) || '';
      } else {
        masked[key] = value || '';
      }
    }
    return NextResponse.json({ ok: true, config: masked });
  } catch (error: any) {
    console.error('[ForoCPI-Config-GET] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    for (const key of ['wp_url', 'wp_user', 'wp_app_password', 'server_ip', 'db_name', 'db_user', 'db_password']) {
      if (body[key] !== undefined) {
        await setConfig(key, body[key] === '' ? null : String(body[key]));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[ForoCPI-Config-PUT] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
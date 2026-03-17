import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/utils/modulos/biury-pagos/module8-config';

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
      if (key === 'access_key' || key === 'siigo_access_key') {
        masked[key] = maskToken(value) || '';
      } else if (key === 'siigo_username') {
        masked[key] = value || '';
      } else {
        masked[key] = value || '';
      }
    }

    return NextResponse.json({
      ok: true,
      config: masked,
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
  try {
    const body = await request.json();
    const { access_key, siigo_username, siigo_access_key } = body;

    if (access_key !== undefined) {
      await setConfig('access_key', access_key === '' ? null : String(access_key));
    }

    if (siigo_username !== undefined) {
      await setConfig('siigo_username', siigo_username === '' ? null : String(siigo_username));
    }

    if (siigo_access_key !== undefined) {
      await setConfig('siigo_access_key', siigo_access_key === '' ? null : String(siigo_access_key));
    }

    return NextResponse.json({
      ok: true,
      message: 'Configuración guardada',
    });
  } catch (error: any) {
    console.error('[Biury-Config-PUT] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

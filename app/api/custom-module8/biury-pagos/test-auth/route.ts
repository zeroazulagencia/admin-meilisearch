import { NextResponse } from 'next/server';
import { getConfig } from '@/utils/modulos/biury-pagos/module8-config';

function maskToken(value: string | null): string {
  if (!value) return '';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export async function POST() {
  try {
    const username = await getConfig('siigo_username');
    const accessKey = await getConfig('siigo_access_key');

    if (!username || !accessKey) {
      return NextResponse.json(
        { ok: false, error: 'Credenciales de Siigo no configuradas' },
        { status: 400 }
      );
    }

    const requestBody = { username, access_key: accessKey };

    const response = await fetch('https://api.siigo.com/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Partner-Id': 'biury',
        'User-Agent': 'Dworkers-Biury/1.0',
      },
      body: JSON.stringify(requestBody),
    });

    const contentType = response.headers.get('content-type');
    let responsePayload: any = null;

    if (contentType && contentType.includes('application/json')) {
      responsePayload = await response.json().catch(() => null);
    } else {
      responsePayload = await response.text().catch(() => null);
    }

    return NextResponse.json({
      ok: response.ok,
      request: {
        url: 'https://api.siigo.com/auth',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Partner-Id': 'biury',
          'User-Agent': 'Dworkers-Biury/1.0',
        },
        body: {
          username,
          access_key: maskToken(accessKey),
        },
      },
      response: {
        status: response.status,
        contentType,
        body: responsePayload,
      },
    });
  } catch (error: any) {
    console.error('[Biury-Test-Auth] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

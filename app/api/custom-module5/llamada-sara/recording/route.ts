import { NextRequest, NextResponse } from 'next/server';
import { requireSesion, leerConfigSara, authTwilio, esUrlGrabacionPropia } from '@/utils/modulos/llamada-sara-5/config';

export const dynamic = 'force-dynamic';

// Proxy de audio para el panel: solo con sesión y solo grabaciones de nuestra cuenta de Twilio.
export async function GET(req: NextRequest) {
  const denied = await requireSesion(req);
  if (denied) return denied;
  try {
    const url = req.nextUrl.searchParams.get('url') ?? '';
    const config = await leerConfigSara();

    if (!config.account_sid || !config.api_key_sid || !config.api_key_secret) {
      return NextResponse.json({ ok: false, error: 'Credenciales no configuradas' }, { status: 500 });
    }
    if (!esUrlGrabacionPropia(url, config.account_sid)) {
      return NextResponse.json({ ok: false, error: 'url no permitida' }, { status: 400 });
    }

    const response = await fetch(url, { headers: { Authorization: authTwilio(config) }, redirect: 'follow' });
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: `Error ${response.status}` }, { status: response.status });
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

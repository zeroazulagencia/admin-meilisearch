import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

const ROOM_REGEX = /^llamada_[a-f0-9]{16}$/;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://workers.zeroazul.com';

const xml = (content: string) =>
  new NextResponse(content, { headers: { 'Content-Type': 'text/xml' } });

async function handler(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const room = params.get('room') ?? req.nextUrl.searchParams.get('room') ?? '';

    if (!ROOM_REGEX.test(room)) {
      return xml('<Response><Say language="es-MX">Sala invalida</Say></Response>');
    }

    const [rows] = await query<any>('SELECT id FROM modulos_sara_11_llamadas WHERE room_id = ?', [room]);
    if (!rows.length) {
      return xml('<Response><Say language="es-MX">Sala no encontrada</Say></Response>');
    }

    const [cfg] = await query<any>(
      "SELECT config_value FROM modulos_sara_11_config WHERE config_key = 'enable_recording'"
    );
    const recordingEnabled = cfg.length > 0 && cfg[0].config_value === 'true';

    let conferenceAttrs = 'startConferenceOnEnter="true" endConferenceOnExit="false"';
    if (recordingEnabled) {
      conferenceAttrs += ` record="record-from-start" recordingStatusCallback="${BASE_URL}/api/custom-module5/llamada-sara/recording-callback" recordingStatusCallbackEvent="completed"`;
    }

    return xml(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference ${conferenceAttrs}>${room}</Conference></Dial></Response>`
    );
  } catch {
    return xml('<Response><Say language="es-MX">Error interno</Say></Response>');
  }
}

export { handler as GET, handler as POST };

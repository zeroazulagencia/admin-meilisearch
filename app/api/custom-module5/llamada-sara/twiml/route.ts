import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

const ROOM_REGEX = /^llamada_[a-f0-9]{16}$/;

const xml = (content: string) =>
  new NextResponse(content, { headers: { 'Content-Type': 'text/xml' } });

async function handler(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const room = params.get('room') ?? req.nextUrl.searchParams.get('room') ?? '';

    if (!ROOM_REGEX.test(room)) {
      return xml('<Response><Say>Sala inválida</Say></Response>');
    }

    const [rows] = await query<any>('SELECT id FROM modulos_sara_11_llamadas WHERE room_id = ?', [room]);
    if (!rows.length) {
      return xml('<Response><Say>Sala no encontrada</Say></Response>');
    }

    return xml(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="false">${room}</Conference></Dial></Response>`
    );
  } catch {
    return xml('<Response><Say>Error interno</Say></Response>');
  }
}

export { handler as GET, handler as POST };

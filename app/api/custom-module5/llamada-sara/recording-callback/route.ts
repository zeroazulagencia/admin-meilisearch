import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { leerConfigSara, authTwilio, esUrlGrabacionPropia } from '@/utils/modulos/llamada-sara-5/config';

export const dynamic = 'force-dynamic';

const ROOM_REGEX = /^llamada_[a-f0-9]{16}$/;
const SID_REGEX = /^CF[a-f0-9]{32}$/;

// Twilio avisa cuando termina la grabación de una conferencia. Para no fiarnos del
// cuerpo, se consulta la conferencia en nuestra cuenta: si existe, su friendly_name
// es la sala y la grabación se guarda en esa llamada (antes iba a la última activa).
async function handler(req: NextRequest) {
  try {
    const params = new URLSearchParams(await req.text());
    const recordingUrl = params.get('RecordingUrl') ?? '';
    const conferenceSid = params.get('ConferenceSid') ?? '';

    if (!recordingUrl || !SID_REGEX.test(conferenceSid)) {
      return NextResponse.json({ ok: false, error: 'Parametros invalidos' }, { status: 400 });
    }

    const config = await leerConfigSara();
    if (!esUrlGrabacionPropia(recordingUrl, config.account_sid)) {
      return NextResponse.json({ ok: false, error: 'RecordingUrl no permitida' }, { status: 400 });
    }

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}/Conferences/${conferenceSid}.json`,
      { headers: { Authorization: authTwilio(config) } }
    );
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Conferencia no encontrada' }, { status: 404 });
    }
    const room = (await res.json())?.friendly_name ?? '';
    if (!ROOM_REGEX.test(room)) {
      return NextResponse.json({ ok: false, error: 'Sala invalida' }, { status: 400 });
    }

    await query('UPDATE modulos_sara_11_llamadas SET recording_url = ? WHERE room_id = ?', [
      recordingUrl + '.mp3',
      room,
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export { handler as POST };

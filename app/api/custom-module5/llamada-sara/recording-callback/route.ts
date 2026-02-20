import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

async function handler(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const recordingUrl = params.get('RecordingUrl') ?? '';
    const conferenceSid = params.get('ConferenceSid') ?? '';

    if (!recordingUrl) {
      return NextResponse.json({ ok: false, error: 'RecordingUrl requerido' }, { status: 400 });
    }

    if (conferenceSid) {
      const friendlyName = conferenceSid;
      const [rows] = await query<any>(
        'SELECT id, room_id FROM modulos_sara_11_llamadas WHERE estado = ? ORDER BY created_at DESC LIMIT 1',
        ['activa']
      );

      if (rows.length) {
        await query(
          'UPDATE modulos_sara_11_llamadas SET recording_url = ? WHERE id = ?',
          [recordingUrl + '.mp3', rows[0].id]
        );
      } else {
        const [recent] = await query<any>(
          'SELECT id FROM modulos_sara_11_llamadas WHERE recording_url IS NULL ORDER BY created_at DESC LIMIT 1',
          []
        );
        if (recent.length) {
          await query(
            'UPDATE modulos_sara_11_llamadas SET recording_url = ? WHERE id = ?',
            [recordingUrl + '.mp3', recent[0].id]
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export { handler as POST };

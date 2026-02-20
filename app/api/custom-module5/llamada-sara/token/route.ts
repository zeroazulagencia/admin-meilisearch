import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

const ROOM_REGEX = /^llamada_[a-f0-9]{16}$/;

export async function GET(req: NextRequest) {
  try {
    const room = req.nextUrl.searchParams.get('room') ?? '';
    const role = req.nextUrl.searchParams.get('role') ?? 'cliente';

    if (!ROOM_REGEX.test(room)) {
      return NextResponse.json({ ok: false, error: 'Sala invalida' }, { status: 400 });
    }

    const [rows] = await query<any>(
      'SELECT id FROM modulos_sara_11_llamadas WHERE room_id = ? AND estado = ?',
      [room, 'activa']
    );
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: 'Sala no encontrada o no activa' }, { status: 404 });
    }

    const [cfg] = await query<any>('SELECT config_key, config_value FROM modulos_sara_11_config');
    const config: Record<string, string> = Object.fromEntries(
      cfg.map((r: any) => [r.config_key, r.config_value ?? ''])
    );

    if (!config.account_sid || !config.api_key_sid || !config.api_key_secret || !config.twiml_app_sid) {
      return NextResponse.json({ ok: false, error: 'Credenciales de Twilio no configuradas' }, { status: 500 });
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: config.twiml_app_sid,
      incomingAllow: true,
    });

    const identity = role === 'asesor' ? 'asesor_admin' : `cliente_${room.slice(-8)}`;

    const token = new AccessToken(
      config.account_sid,
      config.api_key_sid,
      config.api_key_secret,
      { identity, ttl: 3600 }
    );
    token.addGrant(voiceGrant);

    return NextResponse.json({ ok: true, token: token.toJwt() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

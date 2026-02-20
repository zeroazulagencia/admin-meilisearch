import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [cfg] = await query<any>('SELECT config_key, config_value FROM modulos_sara_11_config');
    const config: Record<string, string> = Object.fromEntries(
      cfg.map((r: any) => [r.config_key, r.config_value ?? ''])
    );

    if (!config.account_sid || !config.api_key_sid || !config.api_key_secret) {
      return NextResponse.json({ ok: false, error: 'Credenciales de Twilio no configuradas' }, { status: 500 });
    }

    const auth = Buffer.from(`${config.api_key_sid}:${config.api_key_secret}`).toString('base64');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}/Usage/Records/ThisMonth.json`;

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ ok: false, error: `Twilio API error: ${res.status} - ${text}` }, { status: 502 });
    }

    const data = await res.json();
    const records = data.usage_records || [];

    let totalMinutos = 0;
    let totalLlamadas = 0;
    let costoEstimado = 0;

    for (const record of records) {
      if (record.category === 'calls' || record.category === 'calls-outbound' || record.category === 'calls-inbound') {
        totalLlamadas += parseInt(record.count || '0');
        totalMinutos += parseFloat(record.usage || '0');
        costoEstimado += parseFloat(record.price || '0');
      }
    }

    let balance = null;
    try {
      const balanceUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}/Balance.json`;
      const balRes = await fetch(balanceUrl, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (balRes.ok) {
        const balData = await balRes.json();
        balance = {
          moneda: balData.currency || 'USD',
          saldo: parseFloat(balData.balance || '0'),
        };
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      uso: {
        total_minutos: Math.round(totalMinutos * 100) / 100,
        total_llamadas: totalLlamadas,
        costo_estimado: Math.round(costoEstimado * 100) / 100,
        balance,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

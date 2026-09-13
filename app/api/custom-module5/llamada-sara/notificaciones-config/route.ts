import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

const KEYS = ['notify_email', 'notify_times'];

export async function GET() {
  try {
    const [rows] = await query<any>('SELECT config_key, config_value FROM modulos_sara_11_config WHERE config_key IN (?, ?)', KEYS);
    const config: Record<string, string> = Object.fromEntries(
      rows.map((r: any) => [r.config_key, r.config_value ?? ''])
    );
    return NextResponse.json({
      ok: true,
      config: {
        notify_email: config.notify_email ?? 'cristian.parada@zeroazul.com',
        notify_times: config.notify_times ?? '',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    for (const key of Object.keys(body)) {
      if (!KEYS.includes(key)) continue;
      const val = String(body[key] ?? '');
      await query(
        'INSERT INTO modulos_sara_11_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
        [key, val, val]
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
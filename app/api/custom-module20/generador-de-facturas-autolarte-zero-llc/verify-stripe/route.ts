import { NextResponse } from 'next/server';
import { getConfig } from '@/utils/modulos/generador-de-facturas-autolarte-zero-llc-20/config';

export async function POST() {
  try {
    const key = await getConfig('stripe_key');
    if (!key) {
      return NextResponse.json({ ok: false, error: 'No hay Stripe API Key guardada' }, { status: 400 });
    }

    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || `HTTP ${res.status}`;
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    const data = await res.json();
    return NextResponse.json({
      ok: true,
      data: {
        available: data.available,
        pending: data.pending,
        livemode: data.livemode,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error de conexión' }, { status: 500 });
  }
}

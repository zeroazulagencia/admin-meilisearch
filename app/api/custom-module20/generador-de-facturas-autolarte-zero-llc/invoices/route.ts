import { NextResponse } from 'next/server';
import { getConfig } from '@/utils/modulos/generador-de-facturas-autolarte-zero-llc-20/config';

export const dynamic = 'force-dynamic';

const CUSTOMER_ID = 'cus_Mk1Npqxg8BHBjG';

export async function GET(req: Request) {
  try {
    const key = await getConfig('stripe_key');
    if (!key) {
      return NextResponse.json({ ok: false, error: 'No hay Stripe API Key guardada' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const after = searchParams.get('after');
    const limit = 10;

    let url = `https://api.stripe.com/v1/invoices?customer=${CUSTOMER_ID}&limit=${limit}`;
    if (after) url += `&starting_after=${after}`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || `HTTP ${res.status}`;
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    const data = await res.json();
    const invoices = (data.data || []).map((inv: any) => ({
      id: inv.id,
      number: inv.number,
      created: inv.created,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      invoice_pdf: inv.invoice_pdf,
      hosted_invoice_url: inv.hosted_invoice_url,
    }));

    return NextResponse.json({
      ok: true,
      data: invoices,
      has_more: data.has_more || false,
      last_id: invoices.length > 0 ? invoices[invoices.length - 1].id : null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error de conexión' }, { status: 500 });
  }
}
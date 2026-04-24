import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MIPAQUETE_API_KEY = process.env.MIPAQUETE_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MTA5YTBjZWQ5NGZjYTc2MjUzZGUxZTgiLCJuYW1lIjoiSnVsaWFuIiwic3VybmFtZSI6IlNhbmNoZXoiLCJlbWFpbCI6InJldGVuZGVsY2FzY29AZ21haWwuY29tIiwiY2VsbFBob25lIjoiMzE1ODI1ODkzMCIsImNyZWF0ZWRBdCI6IjIwMjEtMDgtMDNUMjA6MDI6MjIuODMxWiIsImRhdGUiOiIyMDI2LTA0LTA4IDE0OjU5OjE5IiwiaWF0IjoxNzc1Njc4MzU5fQ.q5-3aUUIJsOe3YROCEmFcvU9e9JE_GY9pCBOuEdNqkw';
const MIPAQUETE_API_URL = 'https://api.mipaquete.com/v1/cotizaciones';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname += '/';
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rate = body.rate;

    if (!rate || !rate.origin || !rate.destination || !rate.items) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const originPostal = rate.origin.postal_code || '';
    const destPostal = rate.destination.postal_code || '';
    const destCity = rate.destination.city || '';

    const totalGrams = rate.items.reduce((sum: number, item: any) => sum + (item.grams * item.quantity), 0);
    const totalPrice = rate.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const pesoKg = Math.ceil(totalGrams / 1000);

    console.log('[MIPQUOTE RATES] Request:', { origen: originPostal, destino: destPostal, peso: pesoKg, valor: totalPrice });

    let mpQuote: any = null;
    try {
      const fetchRes = await fetch(MIPAQUETE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MIPAQUETE_API_KEY,
          'Session-Tracker': `shopify-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        },
        body: JSON.stringify({
          origen: originPostal,
          destino: destPostal + (destCity ? `, ${destCity}` : ''),
          peso: pesoKg,
          valor: totalPrice,
        }),
      });

      if (!fetchRes.ok) {
        const errorText = await fetchRes.text();
        console.error('[MIPQUOTE API] Error:', fetchRes.status, errorText);
      } else {
        mpQuote = await fetchRes.json();
      }
    } catch (e: any) {
      console.error('[MIPQUOTE RATES] MiPaquete error:', e.message);
    }

    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const minDate = formatDate(today);
    const maxDate = formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000));

    if (mpQuote && mpQuote.tarifas && mpQuote.tarifas.length > 0) {
      const tarifas = mpQuote.tarifas.map((t: any) => ({
        service_name: t.nombre_servicio || 'Envío MiPaquete',
        service_code: t.codigo_servicio || 'mipaquete',
        total_price: String(Math.round(t.valor_total || t.tarifa || totalPrice * 0.1) * 100),
        currency: rate.currency || 'COP',
        min_delivery_date: minDate,
        max_delivery_date: maxDate,
      }));
      return NextResponse.json({ rates: tarifas });
    }

    const fallbackPrice = Math.max(15000, Math.round(totalPrice * 0.05));
    return NextResponse.json({
      rates: [
        {
          service_name: 'Envío MiPaquete',
          service_code: 'mipaquete',
          total_price: String(fallbackPrice * 100),
          currency: rate.currency || 'COP',
        },
      ],
    });
  } catch (error: any) {
    console.error('[MIPQUOTE RATES] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
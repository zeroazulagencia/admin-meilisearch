import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

const MIPAQUETE_API_KEY = process.env.MIPAQUETE_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MTA5YTBjZWQ5NGZjYTc2MjUzZGUxZTgiLCJuYW1lIjoiSnVsaWFuIiwic3VybmFtZSI6IlNhbmNoZXoiLCJlbWFpbCI6InJldGVuZGVsY2FzY29AZ21haWwuY29tIiwiY2VsbFBob25lIjoiMzE1ODI1ODkzMCIsImNyZWF0ZWRBdCI6IjIwMjEtMDgtMDNUMjA6MDI6MjIuODMxWiIsImRhdGUiOiIyMDI2LTA0LTIwIDE3OjQ0OjEzIiwiaWF0IjoxNzc2NzI1MDUzfQ.xNdWgsL53E80WGZxCdBHWW2C9NrfuuKkP2LQI9kM_94';
const MIPAQUETE_API_URL = 'https://api-v2.mpr.mipaquete.com';

const CITY_TO_DANE: Record<string, string> = {
  'bogota': '11001000', 'bogotá': '11001000',
  'medellin': '05001000', 'medellín': '05001000',
  'cali': '76001000', 'cucuta': '54001000', 'cúcuta': '54001000',
  'barranquilla': '08001000', 'cartagena': '13001000',
  'pereira': '66001000', 'manizales': '17001000',
  'ibague': '73001000', 'bucaramanga': '68001000',
  'envigado': '05266000', 'itagui': '05360000',
};

const DEFAULT_ORIGIN_DANE = '54001000';

async function getLocationCode(city: string): Promise<string> {
  const cityLower = city.toLowerCase().trim();
  if (CITY_TO_DANE[cityLower]) return CITY_TO_DANE[cityLower];
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rate = body.rate;

    if (!rate || !rate.origin || !rate.destination || !rate.items) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    try {
      await query('INSERT INTO modulos_mipaquete_15_logs (type, payload, response) VALUES (?, ?, ?)', ['rates_request', JSON.stringify(body), null]);
    } catch (e) { console.error('[LOG] error:', e); }

    let originDane = rate.origin.postal_code || '';
    let destDane = rate.destination.postal_code || '';
    const originCity = rate.origin.city || '';
    const destCity = rate.destination.city || '';

    if (!originDane && originCity) originDane = await getLocationCode(originCity) || DEFAULT_ORIGIN_DANE;
    if (!originDane) originDane = DEFAULT_ORIGIN_DANE;
    if (!destDane && destCity) destDane = await getLocationCode(destCity);

    const totalGrams = rate.items.reduce((sum: number, item: any) => sum + (item.grams * item.quantity), 0);
    const totalPrice = rate.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const pesoKg = Math.ceil(totalGrams / 1000);
    const declaredValue = Math.min(totalPrice, 500000);

    const basePrice = 14500, extraPerKg = 4500;
    const fallbackPrice = basePrice + Math.max(0, pesoKg - 1) * extraPerKg;

    console.log('[RATES] Request:', { origen: originDane, destino: destDane, peso: pesoKg });

    let mpQuote: any = null;

    if (destDane && originDane) {
      try {
        const fetchRes = await fetch(`${MIPAQUETE_API_URL}/quoteShipping`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': MIPAQUETE_API_KEY,
            'Session-Tracker': 'a0c96ea6-b22d-4fb7-a278-850678d5429c',
          },
          body: JSON.stringify({
            originLocationCode: originDane,
            destinyLocationCode: destDane,
            weight: pesoKg,
            height: 14, width: 25, length: 35,
            quantity: 1,
            declaredValue: declaredValue,
            saleValue: declaredValue,
          }),
        });

        if (!fetchRes.ok) {
          const errorText = await fetchRes.text();
          console.error('[API] Error:', fetchRes.status, errorText);
        } else {
          mpQuote = await fetchRes.json();
          console.log('[API] Response:', JSON.stringify(mpQuote));
        }
      } catch (e: any) {
        console.error('[API] MiPaquete error:', e.message);
      }
    }

    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const minDate = formatDate(today);
    const maxDate = formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000));

    if (mpQuote && Array.isArray(mpQuote) && mpQuote.length > 0) {
      const sorted = [...mpQuote].sort((a, b) => a.shippingCost - b.shippingCost);
      const best = sorted[0];
      const tarifas = [{
        service_name: best.deliveryCompanyName || 'Envío MiPaquete',
        service_code: 'mipaquete',
        total_price: String(Math.round(best.shippingCost * 100)),
        currency: rate.currency || 'COP',
        min_delivery_date: minDate,
        max_delivery_date: maxDate,
      }];

      try {
        await query('INSERT INTO modulos_mipaquete_15_logs (type, payload, response) VALUES (?, ?, ?)', ['rates_response', JSON.stringify(body), JSON.stringify({ rates: tarifas })]);
      } catch (e) { console.error('[LOG] error:', e); }

      return NextResponse.json({ rates: tarifas });
    }

    const response = {
      rates: [{ service_name: 'Envío MiPaquete', service_code: 'mipaquete', total_price: String(fallbackPrice * 100), currency: rate.currency || 'COP', min_delivery_date: minDate, max_delivery_date: maxDate }],
    };

    try {
      await query('INSERT INTO modulos_mipaquete_15_logs (type, payload, response) VALUES (?, ?, ?)', ['rates_response', JSON.stringify(body), JSON.stringify(response)]);
    } catch (e) { console.error('[LOG] error:', e); }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[RATES] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname += '/';
  return NextResponse.redirect(url);
}
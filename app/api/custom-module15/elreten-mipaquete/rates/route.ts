import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

const MIPAQUETE_API_KEY = process.env.MIPAQUETE_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MTA5YTBjZWQ5NGZjYTc2MjUzZGUxZTgiLCJuYW1lIjoiSnVsaWFuIiwic3VybmFtZSI6IlNhbmNoZXoiLCJlbWFpbCI6InJldGVuZGVsY2FzY29AZ21haWwuY29tIiwiY2VsbFBob25lIjoiMzE1ODI1ODkzMCIsImNyZWF0ZWRBdCI6IjIwMjEtMDgtMDNUMjA6MDI6MjIuODMxWiIsImRhdGUiOiIyMDI2LTA0LTIwIDE3OjQ0OjEzIiwiaWF0IjoxNzc2NzI1MDUzfQ.xNdWgsL53E80WGZxCdBHWW2C9NrfuuKkP2LQI9kM_94';
const MIPAQUETE_API_URL = 'https://api.mipaquete.com';

const CITY_TO_DANE: Record<string, string> = {
  'bogota': '11001',
  'bogotá': '11001',
  'medellin': '05001',
  'medellín': '05001',
  'cali': '76001',
  'cucuta': '54001',
  'cúcuta': '54001',
  'barranquilla': '08001',
  'cartagena': '13001',
  'pereira': '66001',
  'manizales': '17001',
  'ibague': '73001',
  'bucaramanga': '68001',
  'neiva': '41001',
  'popayan': '19001',
  'santa marta': '47001',
  'valledupar': '20001',
  'santo domigo': '25799',
  'leticia': '91001',
  'san andres': '88001',
  'tunja': '15001',
  'quibdo': '27001',
  'armenia': '63001',
  'sincelejo': '70001',
  'monteria': '23001',
  'riohacha': '44001',
  'arauca': '81001',
  'yopal': '85001',
  'maturin': '50001',
  'envigado': '05266',
  'itagui': '05360',
  'sabaneta': '05615',
  'la estrella': '05380',
  'bello': '05088',
  'rionegro': '05652',
  'dublin': '11001',
  'lisbon': '11001',
  'madrid': '11001',
};

const DEFAULT_ORIGIN_DANE = '54001';

async function getLocationCode(city: string): Promise<string | null> {
  if (!city) return null;
  
  const cityLower = city.toLowerCase().trim();
  
  if (CITY_TO_DANE[cityLower]) {
    return CITY_TO_DANE[cityLower];
  }
  
  try {
    const res = await fetch(`${MIPAQUETE_API_URL}/v1/getLocations?locationCode=${encodeURIComponent(cityLower)}`, {
      headers: {
        'apikey': MIPAQUETE_API_KEY,
        'Session-Tracker': 'a0c96ea6-b22d-4fb7-a278-850678d54290',
      },
    });
    
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const found = data.find((loc: any) => 
          loc.locationName?.toLowerCase() === cityLower || 
          loc.locationName?.toLowerCase().includes(cityLower)
        );
        if (found?.locationCode) {
          return found.locationCode;
        }
      }
    }
  } catch (e) {
    console.error('[MIPQUOTE] getLocations error:', e);
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname += '/';
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rate = body.rate;

    console.log('[MIPQUOTE RATES] Received body:', JSON.stringify(body));

    if (!rate || !rate.origin || !rate.destination || !rate.items) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    try {
      await query(
        'INSERT INTO modulos_mipaquete_15_logs (type, payload, response) VALUES (?, ?, ?)',
        ['rates_request', JSON.stringify(body), null]
      );
    } catch (e) {
      console.error('[MIPQUOTE RATES] Log error:', e);
    }

    let originDane = rate.origin.postal_code || '';
    let destDane = rate.destination.postal_code || '';
    const originCity = rate.origin.city || '';
    const destCity = rate.destination.city || '';

    if (!originDane && originCity) {
      originDane = await getLocationCode(originCity) || DEFAULT_ORIGIN_DANE;
    }
    if (!originDane) {
      originDane = DEFAULT_ORIGIN_DANE;
    }

    if (!destDane && destCity) {
      destDane = await getLocationCode(destCity) || '';
    }

    const totalGrams = rate.items.reduce((sum: number, item: any) => sum + (item.grams * item.quantity), 0);
    const totalPrice = rate.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const pesoKg = Math.ceil(totalGrams / 1000);
    const declaredValue = Math.max(totalPrice, 10000);

    const basePrice = 14500;
    const extraPerKg = 4500;
    const fallbackPrice = basePrice + (Math.max(0, pesoKg - 1)) * extraPerKg;

console.log('[MIPQUOTE RATES] Request:', { 
      origen: originDane, 
      destino: destDane, 
      peso: pesoKg,
      valor: totalPrice,
      originCity,
      destCity 
    });

    let mpQuote: any = null;

    if (destDane && originDane) {
      try {
        const fetchRes = await fetch(`${MIPAQUETE_API_URL}/v1/quoteShipping`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': MIPAQUETE_API_KEY,
            'Session-Tracker': 'a0c96ea6-b22d-4fb7-a278-850678d54290',
          },
          body: JSON.stringify({
            originLocationCode: originDane,
            destinyLocationCode: destDane,
            weight: pesoKg,
            height: 10,
            width: 10,
            length: 10,
            quantity: 1,
            declaredValue: declaredValue,
          }),
        });

        if (!fetchRes.ok) {
          const errorText = await fetchRes.text();
          console.error('[MIPQUOTE API] Error:', fetchRes.status, errorText);
        } else {
          mpQuote = await fetchRes.json();
          console.log('[MIPQUOTE API] Response:', JSON.stringify(mpQuote));
        }
      } catch (e: any) {
        console.error('[MIPQUOTE RATES] MiPaquete error:', e.message);
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
        await query(
          'INSERT INTO modulos_mipaquete_15_logs (type, payload, response) VALUES (?, ?, ?)',
          ['rates_response', JSON.stringify(body), JSON.stringify({ rates: tarifas })]
        );
      } catch (e) {
        console.error('[MIPQUOTE RATES] Log error:', e);
      }

      return NextResponse.json({ rates: tarifas });
    }

    const response = {
      rates: [
        {
          service_name: 'Envío MiPaquete',
          service_code: 'mipaquete',
          total_price: String(fallbackPrice * 100),
          currency: rate.currency || 'COP',
          min_delivery_date: minDate,
          max_delivery_date: maxDate,
        },
      ],
    };

    try {
      await query(
        'INSERT INTO modulos_mipaquete_15_logs (type, payload, response) VALUES (?, ?, ?)',
        ['rates_response', JSON.stringify(body), JSON.stringify(response)]
      );
    } catch (e) {
      console.error('[MIPQUOTE RATES] Log error:', e);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[MIPQUOTE RATES] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
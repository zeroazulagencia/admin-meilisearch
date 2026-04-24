import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MIPAQUETE_API_KEY = process.env.MIPAQUETE_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MTA5YTBjZWQ5NGZjYTc2MjUzZGUxZTgiLCJuYW1lIjoiSnVsaWFuIiwic3VybmFtZSI6IlNhbmNoZXoiLCJlbWFpbCI6InJldGVuZGVsY2FzY29AZ21haWwuY29tIiwiY2VsbFBob25lIjoiMzE1ODI1ODkzMCIsImNyZWF0ZWRBdCI6IjIwMjEtMDgtMDNUMjA6MDI6MjIuODMxWiIsImRhdGUiOiIyMDI2LTA0LTA4IDE0OjU5OjE5IiwiaWF0IjoxNzc1Njc4MzU5fQ.q5-3aUUIJsOe3YROCEmFcvU9e9JE_GY9pCBOuEdNqkw';
const MIPAQUETE_API_URL = 'https://api.mipaquete.com/v1/cotizaciones';

interface ShopifyRateRequest {
  rate: {
    origin: {
      postal_code: string;
      country: string;
    };
    destination: {
      postal_code: string;
      country: string;
      city?: string;
    };
    items: Array<{
      name: string;
      quantity: number;
      grams: number;
      price: number;
    }>;
    currency: string;
  };
}

interface MiPaqueteQuoteRequest {
  origen: string;
  destino: string;
  peso: number;
  valor: number;
  largo?: number;
  ancho?: number;
  alto?: number;
}

async function getMiPaqueteQuote(origen: string, destino: string, peso: number, valor: number) {
  const body: MiPaqueteQuoteRequest = {
    origen,
    destino,
    peso,
    valor,
  };

  const response = await fetch(MIPAQUETE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': MIPAQUETE_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[MIPQUOTE API] Error:', response.status, errorText);
    throw new Error(`MiPaquete API error: ${response.status}`);
  }

  return response.json();
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  try {
    const body: ShopifyRateRequest = await request.json();
    const { rate } = body;

    if (!rate || !rate.origin || !rate.destination || !rate.items) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const originPostal = rate.origin.postal_code || '';
    const destPostal = rate.destination.postal_code || '';
    const destCity = rate.destination.city || '';

    const totalGrams = rate.items.reduce((sum, item) => sum + (item.grams * item.quantity), 0);
    const totalPrice = rate.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const pesoKg = Math.ceil(totalGrams / 1000);

    console.log('[MIPQUOTE RATES] Request:', {
      origen: originPostal,
      destino: destPostal,
      peso: pesoKg,
      valor: totalPrice,
    });

    let mpQuote: any = null;
    let mpError = null;

    try {
      mpQuote = await getMiPaqueteQuote(
        originPostal,
        destPostal + (destCity ? `, ${destCity}` : ''),
        pesoKg,
        totalPrice
      );
    } catch (e: any) {
      mpError = e.message;
      console.error('[MIPQUOTE RATES] MiPaquete error:', mpError);
    }

    const today = new Date();
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
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
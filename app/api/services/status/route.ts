import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const service = request.nextUrl.searchParams.get('service');
  
  if (!service) {
    return NextResponse.json({ error: 'Service parameter required' }, { status: 400 });
  }

  try {
    switch (service) {
      case 'meilisearch': {
        const url = process.env.MEILISEARCH_URL;
        const apiKey = process.env.MEILISEARCH_API_KEY;
        
        if (!url || !apiKey) {
          return NextResponse.json({ 
            online: false, 
            message: 'No hay conexión disponible',
            reason: 'Missing credentials'
          });
        }

        try {
          // Endpoint simple para verificar estado
          const cleanUrl = url.endsWith('/') ? url : `${url}/`;
          const response = await fetch(`${cleanUrl}health`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`
            },
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok,
            message: response.ok ? 'ONLINE' : 'OFFLINE'
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message
          });
        }
      }

      case 'n8n': {
        const url = process.env.N8N_URL;
        const apiKey = process.env.N8N_API_KEY;
        
        if (!url || !apiKey) {
          return NextResponse.json({ 
            online: false, 
            message: 'No hay conexión disponible',
            reason: 'Missing credentials'
          });
        }

        try {
          const response = await fetch(`${url}api/v1/workflows`, {
            method: 'GET',
            headers: {
              'X-N8N-API-KEY': apiKey
            },
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok,
            message: response.ok ? 'ONLINE' : 'OFFLINE'
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message
          });
        }
      }

      case 'alegra': {
        const email = process.env.ALEGRA_EMAIL;
        const token = process.env.ALEGRA_API_TOKEN;
        
        if (!email || !token) {
          return NextResponse.json({ 
            online: false, 
            message: 'No hay conexión disponible',
            reason: 'Missing credentials'
          });
        }

        try {
          const auth = Buffer.from(`${email}:${token}`).toString('base64');
          const response = await fetch('https://api.alegra.com/api/v1/contacts', {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${auth}`
            },
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok,
            message: response.ok ? 'ONLINE' : 'OFFLINE'
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message
          });
        }
      }

      case 'stripe': {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        
        if (!secretKey) {
          return NextResponse.json({ 
            online: false, 
            message: 'No hay conexión disponible',
            reason: 'Missing credentials'
          });
        }

        try {
          const response = await fetch('https://api.stripe.com/v1/balance', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${secretKey}`
            },
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok,
            message: response.ok ? 'ONLINE' : 'OFFLINE'
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message
          });
        }
      }

      default:
        return NextResponse.json({ error: 'Unknown service' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      online: false, 
      message: 'OFFLINE',
      error: error.message
    });
  }
}


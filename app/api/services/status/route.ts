import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const service = request.nextUrl.searchParams.get('service');
  const apiKey = request.nextUrl.searchParams.get('apiKey') || '';
  const checkUrl = request.nextUrl.searchParams.get('checkUrl') || '';
  
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
            message: response.ok ? 'ONLINE' : 'OFFLINE',
            reason: response.ok ? undefined : `HTTP ${response.status}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
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
            message: response.ok ? 'ONLINE' : 'OFFLINE',
            reason: response.ok ? undefined : `HTTP ${response.status}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
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
            message: response.ok ? 'ONLINE' : 'OFFLINE',
            reason: response.ok ? undefined : `HTTP ${response.status}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
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
            message: response.ok ? 'ONLINE' : 'OFFLINE',
            reason: response.ok ? undefined : `HTTP ${response.status}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
          });
        }
      }

      case 'openai': {
        const keyToUse = apiKey || process.env.OPENAI_API_KEY;
        
        if (!keyToUse) {
          // Si no hay API key, verificar conectividad básica
          if (checkUrl) {
            try {
              const response = await fetch(checkUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000)
              });
              return NextResponse.json({ 
                online: response.ok || response.status < 500,
                message: response.ok || response.status < 500 ? 'ONLINE' : 'OFFLINE',
                reason: response.ok || response.status < 500 ? undefined : `HTTP ${response.status}`
              });
            } catch (e: any) {
              return NextResponse.json({ 
                online: false, 
                message: 'OFFLINE',
                error: e.message,
                reason: 'No se pudo conectar al servicio'
              });
            }
          }
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            reason: 'Missing API key'
          });
        }

        try {
          // Petición mínima: listar modelos
          const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${keyToUse}`
            },
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok,
            message: response.ok ? 'ONLINE' : 'OFFLINE',
            reason: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
          });
        }
      }

      case 'xai':
      case 'x-ai': {
        const keyToUse = apiKey || process.env.XAI_API_KEY;
        
        if (!keyToUse) {
          if (checkUrl) {
            try {
              const response = await fetch(checkUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000)
              });
              return NextResponse.json({ 
                online: response.ok || response.status < 500,
                message: response.ok || response.status < 500 ? 'ONLINE' : 'OFFLINE',
                reason: response.ok || response.status < 500 ? undefined : `HTTP ${response.status}`
              });
            } catch (e: any) {
              return NextResponse.json({ 
                online: false, 
                message: 'OFFLINE',
                error: e.message,
                reason: 'No se pudo conectar al servicio'
              });
            }
          }
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            reason: 'Missing API key'
          });
        }

        try {
          const response = await fetch('https://api.x.ai/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${keyToUse}`
            },
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok,
            message: response.ok ? 'ONLINE' : 'OFFLINE',
            reason: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
          });
        }
      }

      case 'gemini':
      case 'google': {
        const keyToUse = apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        
        if (!keyToUse) {
          if (checkUrl) {
            try {
              const response = await fetch(checkUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000)
              });
              return NextResponse.json({ 
                online: response.ok || response.status < 500,
                message: response.ok || response.status < 500 ? 'ONLINE' : 'OFFLINE',
                reason: response.ok || response.status < 500 ? undefined : `HTTP ${response.status}`
              });
            } catch (e: any) {
              return NextResponse.json({ 
                online: false, 
                message: 'OFFLINE',
                error: e.message,
                reason: 'No se pudo conectar al servicio'
              });
            }
          }
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            reason: 'Missing API key'
          });
        }

        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${keyToUse}`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok,
            message: response.ok ? 'ONLINE' : 'OFFLINE',
            reason: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
          });
        }
      }

      case 'replicate': {
        const keyToUse = apiKey || process.env.REPLICATE_API_TOKEN;
        
        if (!keyToUse) {
          if (checkUrl) {
            try {
              const response = await fetch(checkUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000)
              });
              return NextResponse.json({ 
                online: response.ok || response.status < 500,
                message: response.ok || response.status < 500 ? 'ONLINE' : 'OFFLINE',
                reason: response.ok || response.status < 500 ? undefined : `HTTP ${response.status}`
              });
            } catch (e: any) {
              return NextResponse.json({ 
                online: false, 
                message: 'OFFLINE',
                error: e.message,
                reason: 'No se pudo conectar al servicio'
              });
            }
          }
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            reason: 'Missing API token'
          });
        }

        try {
          const response = await fetch('https://api.replicate.com/v1/account', {
            method: 'GET',
            headers: {
              'Authorization': `Token ${keyToUse}`
            },
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok,
            message: response.ok ? 'ONLINE' : 'OFFLINE',
            reason: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
          });
        }
      }

      case 'openrouter': {
        const keyToUse = apiKey || process.env.OPENROUTER_API_KEY;
        
        if (!keyToUse) {
          if (checkUrl) {
            try {
              const response = await fetch(checkUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000)
              });
              return NextResponse.json({ 
                online: response.ok || response.status < 500,
                message: response.ok || response.status < 500 ? 'ONLINE' : 'OFFLINE',
                reason: response.ok || response.status < 500 ? undefined : `HTTP ${response.status}`
              });
            } catch (e: any) {
              return NextResponse.json({ 
                online: false, 
                message: 'OFFLINE',
                error: e.message,
                reason: 'No se pudo conectar al servicio'
              });
            }
          }
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            reason: 'Missing API key'
          });
        }

        try {
          const response = await fetch('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${keyToUse}`
            },
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok,
            message: response.ok ? 'ONLINE' : 'OFFLINE',
            reason: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
          });
        }
      }

      case 'aws':
      case 'aws-lightsail': {
        // AWS: verificar conectividad básica con checkUrl o URL por defecto
        const urlToCheck = checkUrl || 'https://lightsail.aws.amazon.com/';
        try {
          const response = await fetch(urlToCheck, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok || response.status < 500,
            message: response.ok || response.status < 500 ? 'ONLINE' : 'OFFLINE',
            reason: response.ok || response.status < 500 ? 'Servicio accesible' : `HTTP ${response.status}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: 'No se puede conectar al servicio'
          });
        }
      }

      case 'rapidapi': {
        const keyToUse = apiKey || process.env.RAPIDAPI_KEY;
        const urlToCheck = checkUrl || 'https://rapidapi.com/';
        
        if (!keyToUse) {
          // Sin API key, verificar conectividad básica
          try {
            const response = await fetch(urlToCheck, {
              method: 'HEAD',
              signal: AbortSignal.timeout(5000)
            });
            
            return NextResponse.json({ 
              online: response.ok || response.status < 500,
              message: response.ok || response.status < 500 ? 'ONLINE' : 'OFFLINE',
              reason: response.ok || response.status < 500 ? 'Servicio accesible' : `HTTP ${response.status}`
            });
          } catch (e: any) {
            return NextResponse.json({ 
              online: false, 
              message: 'OFFLINE',
              error: e.message,
              reason: 'No se pudo conectar al servicio'
            });
          }
        }

        // Con API key, verificar conectividad básica (RapidAPI no tiene endpoint simple de verificación)
        try {
          const response = await fetch(urlToCheck, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          
          return NextResponse.json({ 
            online: response.ok || response.status < 500,
            message: response.ok || response.status < 500 ? 'ONLINE' : 'OFFLINE',
            reason: response.ok || response.status < 500 ? undefined : `HTTP ${response.status}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
          });
        }
      }

      case 'claude':
      case 'anthropic': {
        const keyToUse = apiKey || process.env.ANTHROPIC_API_KEY;
        
        if (!keyToUse) {
          if (checkUrl) {
            try {
              const response = await fetch(checkUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000)
              });
              return NextResponse.json({ 
                online: response.ok || response.status < 500,
                message: response.ok || response.status < 500 ? 'ONLINE' : 'OFFLINE',
                reason: response.ok || response.status < 500 ? undefined : `HTTP ${response.status}`
              });
            } catch (e: any) {
              return NextResponse.json({ 
                online: false, 
                message: 'OFFLINE',
                error: e.message,
                reason: 'No se pudo conectar al servicio'
              });
            }
          }
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            reason: 'Missing API key'
          });
        }

        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': keyToUse,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'test' }]
            }),
            signal: AbortSignal.timeout(5000)
          });
          
          const isOnline = response.ok || response.status === 400 || response.status === 401;
          
          return NextResponse.json({ 
            online: isOnline,
            message: isOnline ? 'ONLINE' : 'OFFLINE',
            reason: isOnline ? undefined : `HTTP ${response.status}: ${response.statusText}`
          });
        } catch (e: any) {
          return NextResponse.json({ 
            online: false, 
            message: 'OFFLINE',
            error: e.message,
            reason: e.message
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


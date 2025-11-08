import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt, isEncrypted } from '@/utils/encryption';

// POST - Obtener webhooks configurados para un número de WhatsApp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id' 
      }, { status: 400 });
    }

    // Obtener configuración de WhatsApp del agente
    const [rows] = await query<any>(
      'SELECT whatsapp_phone_number_id, whatsapp_access_token FROM agents WHERE id = ? LIMIT 1',
      [agent_id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Agente no encontrado' 
      }, { status: 404 });
    }

    const agent = rows[0];
    const phoneNumberId = agent.whatsapp_phone_number_id;
    const encryptedAccessToken = agent.whatsapp_access_token;

    if (!phoneNumberId || !encryptedAccessToken) {
      return NextResponse.json({ 
        ok: false, 
        error: 'El agente no tiene configuración completa de WhatsApp' 
      }, { status: 400 });
    }

    // Desencriptar el access token
    const accessToken = isEncrypted(encryptedAccessToken) 
      ? decrypt(encryptedAccessToken) 
      : encryptedAccessToken;

    // Obtener webhooks configurados usando la API de Graph
    // Endpoint: GET /{phone-number-id}/subscribed_apps
    const apiVersions = ['v21.0', 'v18.0', 'v17.0'];
    let webhooks = null;
    let lastError = null;

    for (const version of apiVersions) {
      try {
        const response = await axios.get(
          `https://graph.facebook.com/${version}/${phoneNumberId}/subscribed_apps`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        webhooks = response.data;
        break; // Si funciona, salir del loop
      } catch (error: any) {
        lastError = error;
        console.log(`[GET WEBHOOKS] Error con API ${version}:`, error.response?.data || error.message);
        // Continuar con la siguiente versión
      }
    }

    if (!webhooks) {
      return NextResponse.json({ 
        ok: false, 
        error: lastError?.response?.data?.error?.message || lastError?.message || 'Error al obtener webhooks',
        details: lastError?.response?.data
      }, { status: lastError?.response?.status || 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      data: webhooks 
    });
  } catch (e: any) {
    console.error('[GET WEBHOOKS] Error:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al obtener webhooks' 
    }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt, isEncrypted } from '@/utils/encryption';
import { validateCriticalEnvVars } from '@/utils/validate-env';

// Validar variables de entorno críticas al cargar el módulo
try {
  validateCriticalEnvVars();
} catch (error: any) {
  console.error('[API WHATSAPP GET-MESSAGE-STATUS] Error de validación de variables de entorno:', error.message);
}

// POST - Obtener estado de entrega de un mensaje
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, message_id } = body;

    if (!agent_id || !message_id) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id y message_id' 
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
    let accessToken: string;
    if (isEncrypted(encryptedAccessToken)) {
      accessToken = decrypt(encryptedAccessToken);
    } else {
      accessToken = encryptedAccessToken;
    }

    // Obtener estado del mensaje desde WhatsApp Business API
    // Endpoint: https://graph.facebook.com/v21.0/{message-id}
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${message_id}`,
        {
          params: {
            fields: 'id,status,recipient_id',
            access_token: accessToken
          },
          timeout: 10000
        }
      );

      if (response.data) {
        return NextResponse.json({
          ok: true,
          message: 'Estado del mensaje obtenido exitosamente',
          data: {
            message_id: response.data.id,
            status: response.data.status,
            recipient_id: response.data.recipient_id
          }
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: 'La respuesta de la API no contiene los datos esperados'
        }, { status: 400 });
      }
    } catch (apiError: any) {
      console.error('[WHATSAPP GET MESSAGE STATUS] API Error:', apiError.response?.data || apiError.message);
      
      if (apiError.response?.status === 401 || apiError.response?.status === 403) {
        return NextResponse.json({
          ok: false,
          error: 'Token de acceso inválido o expirado. Verifica el Access Token del agente.'
        }, { status: 401 });
      }
      
      if (apiError.response?.status === 404) {
        return NextResponse.json({
          ok: false,
          error: 'Mensaje no encontrado. Verifica que el message_id sea correcto.'
        }, { status: 404 });
      }

      return NextResponse.json({
        ok: false,
        error: apiError.response?.data?.error?.message || 'Error al obtener el estado del mensaje desde WhatsApp Business API'
      }, { status: apiError.response?.status || 500 });
    }
  } catch (e: any) {
    console.error('[WHATSAPP GET MESSAGE STATUS] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al procesar la solicitud' 
    }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt } from '@/utils/encryption';

// POST - Enviar mensaje de texto a través de WhatsApp Business API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, phone_number, message } = body;

    if (!agent_id || !phone_number || !message) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id, phone_number y message' 
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
    const accessToken = decrypt(encryptedAccessToken);

    // Validar formato del número de teléfono (debe incluir código de país sin +)
    const cleanPhoneNumber = phone_number.replace(/[^0-9]/g, '');
    if (cleanPhoneNumber.length < 10) {
      return NextResponse.json({ 
        ok: false, 
        error: 'El número de teléfono debe incluir código de país (ej: 573001234567)' 
      }, { status: 400 });
    }

    // Enviar mensaje a través de WhatsApp Business API
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanPhoneNumber,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.messages && response.data.messages.length > 0) {
        return NextResponse.json({
          ok: true,
          message: 'Mensaje enviado exitosamente',
          data: {
            message_id: response.data.messages[0].id,
            to: cleanPhoneNumber,
            status: 'sent'
          }
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: 'La respuesta de la API no contiene los datos esperados'
        }, { status: 400 });
      }
    } catch (apiError: any) {
      console.error('[WHATSAPP SEND MESSAGE] API Error:', apiError.response?.data || apiError.message);
      
      // Errores comunes de la API de WhatsApp
      if (apiError.response?.status === 401 || apiError.response?.status === 403) {
        return NextResponse.json({
          ok: false,
          error: 'Token de acceso inválido o expirado. Verifica el Access Token del agente.'
        }, { status: 401 });
      }
      
      if (apiError.response?.status === 400) {
        const errorMessage = apiError.response?.data?.error?.message || 'Error en la solicitud';
        return NextResponse.json({
          ok: false,
          error: `Error al enviar el mensaje: ${errorMessage}`
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: false,
        error: apiError.response?.data?.error?.message || 'Error al enviar el mensaje a través de WhatsApp Business API'
      }, { status: apiError.response?.status || 500 });
    }
  } catch (e: any) {
    console.error('[WHATSAPP SEND MESSAGE] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al procesar el envío del mensaje' 
    }, { status: 500 });
  }
}


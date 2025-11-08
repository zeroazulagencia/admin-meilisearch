import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt, isEncrypted } from '@/utils/encryption';

// POST - Configurar o actualizar webhook para un número de WhatsApp
// Nota: El webhook_url se configura en Meta Business Manager
// Este endpoint solo suscribe los campos (subscribed_fields) para recibir eventos
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, fields } = body;

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

    // Campos por defecto si no se especifican (campos esenciales de WhatsApp)
    const webhookFields = fields || [
      'messages',
      'messaging_postbacks',
      'message_deliveries',
      'message_reads',
      'message_echoes',
      'message_reactions',
      'message_unsends',
      'message_replies',
      'messaging_handovers',
      'messaging_optins',
      'messaging_optouts',
      'messaging_policy_enforcement',
      'messaging_app_roles',
      'messaging_seen',
      'messaging_account_linking',
      'messaging_referrals',
      'messaging_fblogin_account_linking',
      'messaging_customer_information',
      'messaging_phone_number',
      'messaging_phone_number_name_status',
      'messaging_phone_number_quality_update'
    ];

    // Suscribir campos de webhook usando la API de Graph
    // Endpoint: POST /{phone-number-id}/subscribed_apps
    // Nota: El webhook_url se configura en Meta Business Manager, no aquí
    const apiVersions = ['v21.0', 'v18.0', 'v17.0'];
    let result = null;
    let lastError = null;

    for (const version of apiVersions) {
      try {
        const response = await axios.post(
          `https://graph.facebook.com/${version}/${phoneNumberId}/subscribed_apps`,
          {
            subscribed_fields: webhookFields.join(',')
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        result = response.data;
        break; // Si funciona, salir del loop
      } catch (error: any) {
        lastError = error;
        console.log(`[CONFIGURE WEBHOOK] Error con API ${version}:`, error.response?.data || error.message);
        // Continuar con la siguiente versión
      }
    }

    if (!result) {
      return NextResponse.json({ 
        ok: false, 
        error: lastError?.response?.data?.error?.message || lastError?.message || 'Error al configurar webhook',
        details: lastError?.response?.data
      }, { status: lastError?.response?.status || 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      data: result,
      message: 'Campos de webhook suscritos exitosamente. Nota: El webhook_url debe configurarse en Meta Business Manager.'
    });
  } catch (e: any) {
    console.error('[CONFIGURE WEBHOOK] Error:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al configurar webhook' 
    }, { status: 500 });
  }
}

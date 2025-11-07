import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt } from '@/utils/encryption';

// POST - Obtener plantillas de mensajes de WhatsApp Business API
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
      'SELECT whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_access_token FROM agents WHERE id = ? LIMIT 1',
      [agent_id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Agente no encontrado' 
      }, { status: 404 });
    }

    const agent = rows[0];
    const businessAccountId = agent.whatsapp_business_account_id;
    const phoneNumberId = agent.whatsapp_phone_number_id;
    const encryptedAccessToken = agent.whatsapp_access_token;

    if (!encryptedAccessToken) {
      return NextResponse.json({ 
        ok: false, 
        error: 'El agente no tiene configuración completa de WhatsApp' 
      }, { status: 400 });
    }

    // Desencriptar el access token
    const accessToken = decrypt(encryptedAccessToken);

    if (!phoneNumberId) {
      return NextResponse.json({ 
        ok: false, 
        error: 'El agente no tiene Phone Number ID configurado' 
      }, { status: 400 });
    }

    // Obtener el WABA ID desde el Phone Number ID (más confiable que usar el Business Account ID directamente)
    let wabaId = null;
    
    try {
      const phoneInfoResponse = await axios.get(
        `https://graph.facebook.com/v21.0/${phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            fields: 'whatsapp_business_account.id'
          },
          timeout: 10000
        }
      );
      
      if (phoneInfoResponse.data?.whatsapp_business_account?.id) {
        wabaId = phoneInfoResponse.data.whatsapp_business_account.id;
      }
    } catch (e: any) {
      console.error('[WHATSAPP GET TEMPLATES] Error obteniendo WABA ID desde Phone Number ID:', e?.response?.data || e?.message);
      // Si falla, intentar usar el Business Account ID directamente como fallback
      if (businessAccountId) {
        wabaId = businessAccountId;
      }
    }

    if (!wabaId) {
      return NextResponse.json({ 
        ok: false, 
        error: 'No se pudo obtener el Business Account ID. Verifica que el Phone Number ID y el Access Token sean correctos y tengan los permisos necesarios.' 
      }, { status: 400 });
    }

    // Obtener plantillas desde WhatsApp Business API
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            fields: 'id,name,status,language,category,components'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.data) {
        return NextResponse.json({
          ok: true,
          message: 'Plantillas obtenidas exitosamente',
          data: response.data.data
        });
      } else {
        return NextResponse.json({
          ok: true,
          message: 'No hay plantillas disponibles',
          data: []
        });
      }
    } catch (apiError: any) {
      console.error('[WHATSAPP GET TEMPLATES] API Error:', apiError.response?.data || apiError.message);
      
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
          error: `Error al obtener plantillas: ${errorMessage}`
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: false,
        error: apiError.response?.data?.error?.message || 'Error al obtener plantillas desde WhatsApp Business API'
      }, { status: apiError.response?.status || 500 });
    }
  } catch (e: any) {
    console.error('[WHATSAPP GET TEMPLATES] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al procesar la solicitud' 
    }, { status: 500 });
  }
}


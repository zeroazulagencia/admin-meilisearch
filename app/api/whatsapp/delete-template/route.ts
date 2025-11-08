import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt } from '@/utils/encryption';

// POST - Eliminar una plantilla de mensaje en WhatsApp Business API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, template_id } = body;

    if (!agent_id || !template_id) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id y template_id' 
      }, { status: 400 });
    }

    // Obtener configuración de WhatsApp del agente
    const [rows] = await query<any>(
      'SELECT whatsapp_business_account_id, whatsapp_access_token FROM agents WHERE id = ? LIMIT 1',
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
    const encryptedAccessToken = agent.whatsapp_access_token;

    if (!businessAccountId || !encryptedAccessToken) {
      return NextResponse.json({ 
        ok: false, 
        error: 'El agente no tiene configuración completa de WhatsApp (Business Account ID y Access Token requeridos)' 
      }, { status: 400 });
    }

    // Desencriptar el access token
    const accessToken = decrypt(encryptedAccessToken);

    // Intentar eliminar la plantilla con diferentes versiones de la API
    const apiVersions = ['v21.0', 'v18.0', 'v17.0'];
    let response = null;
    let lastError = null;

    for (const version of apiVersions) {
      try {
        response = await axios.delete(
          `https://graph.facebook.com/${version}/${template_id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              access_token: accessToken
            },
            timeout: 30000
          }
        );
        
        // Si llegamos aquí, la solicitud fue exitosa
        break;
      } catch (e: any) {
        lastError = e;
        console.error(`[WHATSAPP DELETE TEMPLATE] Error con ${version}:`, e?.response?.data || e?.message);
        // Continuar con la siguiente versión
        continue;
      }
    }

    // Si ninguna versión funcionó, manejar el error
    if (!response) {
      const apiError = lastError;
      console.error('[WHATSAPP DELETE TEMPLATE] API Error:', apiError?.response?.data || apiError?.message);
      
      // Errores comunes de la API de WhatsApp
      if (apiError?.response?.status === 401 || apiError?.response?.status === 403) {
        return NextResponse.json({
          ok: false,
          error: 'Token de acceso inválido o expirado. Verifica el Access Token del agente.'
        }, { status: 401 });
      }

      if (apiError?.response?.status === 404) {
        return NextResponse.json({
          ok: false,
          error: 'Plantilla no encontrada. Verifica que el ID de la plantilla sea correcto.'
        }, { status: 404 });
      }

      if (apiError?.response?.status === 400) {
        const errorMessage = apiError?.response?.data?.error?.message || 'Error en la solicitud';
        const errorCode = apiError?.response?.data?.error?.code;
        
        return NextResponse.json({
          ok: false,
          error: `Error al eliminar plantilla: ${errorMessage}${errorCode ? ` (Código: ${errorCode})` : ''}`
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: false,
        error: apiError?.response?.data?.error?.message || 'Error al eliminar plantilla en WhatsApp Business API'
      }, { status: apiError?.response?.status || 500 });
    }

    // Procesar respuesta exitosa
    // La API de WhatsApp devuelve { success: true } cuando se elimina correctamente
    return NextResponse.json({
      ok: true,
      message: 'Plantilla eliminada exitosamente',
      data: response.data || { success: true }
    });
  } catch (e: any) {
    console.error('[WHATSAPP DELETE TEMPLATE] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al procesar la solicitud' 
    }, { status: 500 });
  }
}


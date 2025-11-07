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

    if (!phoneNumberId && !businessAccountId) {
      return NextResponse.json({ 
        ok: false, 
        error: 'El agente no tiene Phone Number ID ni Business Account ID configurado' 
      }, { status: 400 });
    }

    // Intentar obtener el WABA ID desde el Phone Number ID primero (más confiable)
    let wabaId = businessAccountId;
    
    if (phoneNumberId) {
      try {
        // Intentar obtener el WABA ID desde el Phone Number ID usando diferentes métodos
        // Método 1: Intentar con v18.0 que puede tener mejor soporte
        const phoneInfoResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${phoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              fields: 'id'
            },
            timeout: 10000
          }
        );
        
        // Si tenemos el phoneNumberId pero no el businessAccountId, intentar obtenerlo
        // Nota: El Phone Number ID no expone directamente el WABA ID en la API pública
        // Por lo tanto, debemos usar el Business Account ID proporcionado
        console.log('[WHATSAPP GET TEMPLATES] Phone Number ID verificado:', phoneNumberId);
      } catch (e: any) {
        console.error('[WHATSAPP GET TEMPLATES] Error verificando Phone Number ID:', e?.response?.data || e?.message);
        // Continuar con el Business Account ID si está disponible
      }
    }
    
    if (!wabaId) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere Business Account ID (WABA ID) para obtener plantillas. El token de acceso necesita permisos para acceder al Business Account. Verifica que el Business Account ID configurado en el agente sea correcto.' 
      }, { status: 400 });
    }

    // Obtener plantillas desde WhatsApp Business API usando el WABA ID
    // Intentar con diferentes versiones de la API si es necesario
    let response;
    const apiVersions = ['v21.0', 'v18.0', 'v17.0'];
    let lastError: any = null;
    
    for (const version of apiVersions) {
      try {
        response = await axios.get(
          `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
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
        
        // Si llegamos aquí, la solicitud fue exitosa
        break;
      } catch (e: any) {
        lastError = e;
        console.error(`[WHATSAPP GET TEMPLATES] Error con ${version}:`, e?.response?.data || e?.message);
        // Continuar con la siguiente versión
        continue;
      }
    }
    
    // Si ninguna versión funcionó, lanzar el último error
    if (!response) {
      throw lastError;
    }

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
        const errorCode = apiError.response?.data?.error?.code;
        const errorSubcode = apiError.response?.data?.error?.error_subcode;
        
        // Error específico de objeto no encontrado o sin permisos
        if (errorCode === 100 || errorSubcode === 33) {
          return NextResponse.json({
            ok: false,
            error: `El Business Account ID (${wabaId}) no existe, no tiene permisos o el token no tiene acceso. Verifica que el Business Account ID sea correcto y que el Access Token tenga los permisos 'whatsapp_business_management' y 'whatsapp_business_messaging'.`
          }, { status: 400 });
        }
        
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


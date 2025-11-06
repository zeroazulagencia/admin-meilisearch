import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt } from '@/utils/encryption';

// POST - Verificar conexión con WhatsApp Business API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { business_account_id, phone_number_id, access_token, agent_id } = body;

    let decryptedAccessToken = access_token;

    // Si se proporciona agent_id, intentar obtener el token desencriptado desde la BD
    if (agent_id && (!access_token || access_token.endsWith('...'))) {
      try {
        const [rows] = await query<any>(
          'SELECT whatsapp_access_token FROM agents WHERE id = ? LIMIT 1',
          [agent_id]
        );
        if (rows && rows.length > 0 && rows[0].whatsapp_access_token) {
          decryptedAccessToken = decrypt(rows[0].whatsapp_access_token);
        }
      } catch (e) {
        console.error('[WHATSAPP VERIFY] Error getting token from DB:', e);
      }
    } else if (access_token && !access_token.endsWith('...')) {
      // Si el token no está enmascarado, usarlo directamente
      decryptedAccessToken = access_token;
    }

    if (!phone_number_id || !decryptedAccessToken) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere Phone Number ID y Access Token para verificar la conexión' 
      }, { status: 400 });
    }

    // Hacer una petición GET a la API de WhatsApp para verificar el número de teléfono
    // Endpoint: https://graph.facebook.com/v21.0/{phone-number-id}
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${phone_number_id}`,
        {
          params: {
            fields: 'id,display_phone_number,verified_name,code_verification_status',
            access_token: decryptedAccessToken
          },
          timeout: 10000
        }
      );

      if (response.data && response.data.id) {
        const phoneNumber = response.data.display_phone_number || response.data.id;
        const verificationStatus = response.data.code_verification_status || 'N/A';
        const verifiedName = response.data.verified_name || 'No disponible';
        
        // Mensaje más detallado
        let statusMessage = '';
        let statusColor = 'success';
        
        if (verificationStatus === 'VERIFIED') {
          statusMessage = 'El número está verificado y operativo.';
        } else if (verificationStatus === 'PENDING') {
          statusMessage = 'El número está pendiente de verificación.';
          statusColor = 'warning';
        } else if (verificationStatus === 'EXPIRED') {
          statusMessage = 'La verificación del número ha expirado. Es necesario renovar la verificación en Meta Business.';
          statusColor = 'warning';
        } else {
          statusMessage = `Estado de verificación: ${verificationStatus}`;
        }
        
        const detailedMessage = `✅ Conexión exitosa con WhatsApp Business API
        
📱 Número de teléfono: ${phoneNumber}
👤 Nombre verificado: ${verifiedName}
🔐 Estado de verificación: ${verificationStatus}
        
${statusMessage}
        
✅ Los datos de conexión son válidos y el servidor puede comunicarse con la API de WhatsApp.`;
        
        return NextResponse.json({
          ok: true,
          message: detailedMessage,
          data: {
            phone_number_id: response.data.id,
            display_phone_number: phoneNumber,
            verified_name: verifiedName,
            code_verification_status: verificationStatus
          },
          status: statusColor
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: 'La respuesta de la API no contiene los datos esperados'
        }, { status: 400 });
      }
    } catch (apiError: any) {
      console.error('[WHATSAPP VERIFY] API Error:', apiError.response?.data || apiError.message);
      
      // Si es un error de autenticación o permiso
      if (apiError.response?.status === 401 || apiError.response?.status === 403) {
        return NextResponse.json({
          ok: false,
          error: 'Token de acceso inválido o expirado. Verifica el Access Token.'
        }, { status: 401 });
      }
      
      // Si el número de teléfono no existe
      if (apiError.response?.status === 404) {
        return NextResponse.json({
          ok: false,
          error: 'Phone Number ID no encontrado. Verifica que el ID sea correcto.'
        }, { status: 404 });
      }

      return NextResponse.json({
        ok: false,
        error: apiError.response?.data?.error?.message || 'Error al verificar la conexión con WhatsApp Business API'
      }, { status: apiError.response?.status || 500 });
    }
  } catch (e: any) {
    console.error('[WHATSAPP VERIFY] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al procesar la verificación' 
    }, { status: 500 });
  }
}


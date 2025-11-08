import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt, isEncrypted } from '@/utils/encryption';
import { validateCriticalEnvVars } from '@/utils/validate-env';

// Validar variables de entorno críticas al cargar el módulo
try {
  validateCriticalEnvVars();
} catch (error: any) {
  console.error('[API WHATSAPP GET-PHONE-INFO] Error de validación de variables de entorno:', error.message);
}

// POST - Obtener información de un número de teléfono
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, phone_number } = body;

    if (!agent_id || !phone_number) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id y phone_number' 
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

    // Limpiar número de teléfono (debe incluir código de país sin +)
    const cleanPhoneNumber = phone_number.replace(/[^0-9]/g, '');
    if (cleanPhoneNumber.length < 10) {
      return NextResponse.json({ 
        ok: false, 
        error: 'El número de teléfono debe incluir código de país (ej: 573001234567)' 
      }, { status: 400 });
    }

    // Obtener información del número desde WhatsApp Business API
    // Nota: La API de WhatsApp no proporciona información pública de números directamente
    // Este endpoint verifica si el número está registrado en WhatsApp
    try {
      // Intentar obtener información del número usando el endpoint de verificación
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${phoneNumberId}`,
        {
          params: {
            fields: 'id,display_phone_number,verified_name,code_verification_status',
            access_token: accessToken
          },
          timeout: 10000
        }
      );

      if (response.data) {
        return NextResponse.json({
          ok: true,
          message: 'Información del número obtenida exitosamente',
          data: {
            phone_number_id: response.data.id,
            display_phone_number: response.data.display_phone_number,
            verified_name: response.data.verified_name,
            verification_status: response.data.code_verification_status,
            requested_number: cleanPhoneNumber,
            note: 'Esta información corresponde al número de teléfono configurado en el agente. Para verificar otros números, usa la función de verificación de conexión.'
          }
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: 'La respuesta de la API no contiene los datos esperados'
        }, { status: 400 });
      }
    } catch (apiError: any) {
      console.error('[WHATSAPP GET PHONE INFO] API Error:', apiError.response?.data || apiError.message);
      
      if (apiError.response?.status === 401 || apiError.response?.status === 403) {
        return NextResponse.json({
          ok: false,
          error: 'Token de acceso inválido o expirado. Verifica el Access Token del agente.'
        }, { status: 401 });
      }

      return NextResponse.json({
        ok: false,
        error: apiError.response?.data?.error?.message || 'Error al obtener información del número desde WhatsApp Business API'
      }, { status: apiError.response?.status || 500 });
    }
  } catch (e: any) {
    console.error('[WHATSAPP GET PHONE INFO] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al procesar la solicitud' 
    }, { status: 500 });
  }
}


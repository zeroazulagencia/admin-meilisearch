import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// POST - Verificar conexión con WhatsApp Business API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { business_account_id, phone_number_id, access_token } = body;

    if (!phone_number_id || !access_token) {
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
            access_token: access_token
          },
          timeout: 10000
        }
      );

      if (response.data && response.data.id) {
        return NextResponse.json({
          ok: true,
          message: `Conexión exitosa. Número verificado: ${response.data.display_phone_number || response.data.id}. Estado: ${response.data.code_verification_status || 'N/A'}`,
          data: {
            phone_number_id: response.data.id,
            display_phone_number: response.data.display_phone_number,
            verified_name: response.data.verified_name,
            code_verification_status: response.data.code_verification_status
          }
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


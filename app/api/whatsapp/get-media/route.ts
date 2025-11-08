import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt, isEncrypted } from '@/utils/encryption';
import { validateCriticalEnvVars } from '@/utils/validate-env';

// Validar variables de entorno críticas al cargar el módulo
try {
  validateCriticalEnvVars();
} catch (error: any) {
  console.error('[API WHATSAPP GET-MEDIA] Error de validación de variables de entorno:', error.message);
}

// POST - Obtener media (imágenes, documentos, etc.) de WhatsApp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, media_id } = body;

    if (!agent_id || !media_id) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id y media_id' 
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

    // Obtener información del media desde WhatsApp Business API
    // Paso 1: Obtener URL del media
    try {
      const mediaInfoResponse = await axios.get(
        `https://graph.facebook.com/v21.0/${media_id}`,
        {
          params: {
            access_token: accessToken
          },
          timeout: 10000
        }
      );

      if (!mediaInfoResponse.data || !mediaInfoResponse.data.url) {
        return NextResponse.json({
          ok: false,
          error: 'No se pudo obtener la URL del media'
        }, { status: 400 });
      }

      const mediaUrl = mediaInfoResponse.data.url;
      const mimeType = mediaInfoResponse.data.mime_type || 'application/octet-stream';
      const fileSize = mediaInfoResponse.data.file_size || 0;
      const sha256 = mediaInfoResponse.data.sha256;

      // Paso 2: Descargar el media usando la URL obtenida
      const mediaResponse = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // Convertir a base64 para enviarlo al frontend
      const base64Media = Buffer.from(mediaResponse.data).toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Media}`;

      return NextResponse.json({
        ok: true,
        message: 'Media obtenido exitosamente',
        data: {
          media_id: media_id,
          mime_type: mimeType,
          file_size: fileSize,
          sha256: sha256,
          data_url: dataUrl,
          download_url: mediaUrl
        }
      });
    } catch (apiError: any) {
      console.error('[WHATSAPP GET MEDIA] API Error:', apiError.response?.data || apiError.message);
      
      if (apiError.response?.status === 401 || apiError.response?.status === 403) {
        return NextResponse.json({
          ok: false,
          error: 'Token de acceso inválido o expirado. Verifica el Access Token del agente.'
        }, { status: 401 });
      }
      
      if (apiError.response?.status === 404) {
        return NextResponse.json({
          ok: false,
          error: 'Media no encontrado. Verifica que el media_id sea correcto y que el media no haya expirado (los media expiran después de cierto tiempo).'
        }, { status: 404 });
      }

      return NextResponse.json({
        ok: false,
        error: apiError.response?.data?.error?.message || 'Error al obtener el media desde WhatsApp Business API'
      }, { status: apiError.response?.status || 500 });
    }
  } catch (e: any) {
    console.error('[WHATSAPP GET MEDIA] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al procesar la solicitud' 
    }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt } from '@/utils/encryption';

// POST - Crear una nueva plantilla de mensaje en WhatsApp Business API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, name, language, category, components } = body;

    if (!agent_id || !name || !language || !category) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id, name, language y category' 
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
    const encryptedAccessToken = agent.whatsapp_access_token;

    if (!businessAccountId || !encryptedAccessToken) {
      return NextResponse.json({ 
        ok: false, 
        error: 'El agente no tiene configuración completa de WhatsApp (Business Account ID y Access Token requeridos)' 
      }, { status: 400 });
    }

    // Desencriptar el access token
    const accessToken = decrypt(encryptedAccessToken);

    // Validar categoría
    const validCategories = ['AUTHENTICATION', 'MARKETING', 'UTILITY'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        ok: false, 
        error: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}` 
      }, { status: 400 });
    }

    // Construir el payload para crear la plantilla
    const templatePayload: any = {
      name: name.trim(),
      language: language.trim(),
      category: category
    };

    // Agregar componentes si están presentes
    if (components && Array.isArray(components) && components.length > 0) {
      templatePayload.components = components.map((comp: any) => {
        const component: any = {
          type: comp.type || 'BODY'
        };

        // Componente BODY
        if (comp.type === 'BODY' && comp.text) {
          component.text = comp.text;
          if (comp.example && comp.example.body_text && Array.isArray(comp.example.body_text)) {
            component.example = {
              body_text: comp.example.body_text
            };
          }
        }

        // Componente HEADER
        if (comp.type === 'HEADER') {
          if (comp.format === 'TEXT' && comp.text) {
            component.format = 'TEXT';
            component.text = comp.text;
            if (comp.example && comp.example.header_text && Array.isArray(comp.example.header_text)) {
              component.example = {
                header_text: comp.example.header_text
              };
            }
          } else if (comp.format === 'IMAGE' || comp.format === 'VIDEO' || comp.format === 'DOCUMENT') {
            component.format = comp.format;
            if (comp.example && comp.example.header_handle && Array.isArray(comp.example.header_handle)) {
              component.example = {
                header_handle: comp.example.header_handle
              };
            }
          }
        }

        // Componente FOOTER
        if (comp.type === 'FOOTER' && comp.text) {
          component.text = comp.text;
        }

        // Componente BUTTONS
        if (comp.type === 'BUTTONS' && comp.buttons && Array.isArray(comp.buttons)) {
          component.buttons = comp.buttons.map((btn: any) => {
            const button: any = {
              type: btn.type || 'QUICK_REPLY'
            };

            if (btn.type === 'QUICK_REPLY' && btn.text) {
              button.text = btn.text;
            } else if (btn.type === 'URL' && btn.text && btn.url) {
              button.text = btn.text;
              button.url = btn.url;
              if (btn.example && Array.isArray(btn.example)) {
                button.example = btn.example;
              }
            } else if (btn.type === 'PHONE_NUMBER' && btn.text && btn.phone_number) {
              button.text = btn.text;
              button.phone_number = btn.phone_number;
            }

            return button;
          });
        }

        return component;
      });
    }

    // Intentar crear la plantilla con diferentes versiones de la API
    const apiVersions = ['v21.0', 'v18.0', 'v17.0'];
    let response = null;
    let lastError = null;

    for (const version of apiVersions) {
      try {
        response = await axios.post(
          `https://graph.facebook.com/${version}/${businessAccountId}/message_templates`,
          templatePayload,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        
        // Si llegamos aquí, la solicitud fue exitosa
        break;
      } catch (e: any) {
        lastError = e;
        console.error(`[WHATSAPP CREATE TEMPLATE] Error con ${version}:`, e?.response?.data || e?.message);
        // Continuar con la siguiente versión
        continue;
      }
    }

    // Si ninguna versión funcionó, manejar el error
    if (!response) {
      const apiError = lastError;
      console.error('[WHATSAPP CREATE TEMPLATE] API Error:', apiError?.response?.data || apiError?.message);
      
      // Errores comunes de la API de WhatsApp
      if (apiError?.response?.status === 401 || apiError?.response?.status === 403) {
        return NextResponse.json({
          ok: false,
          error: 'Token de acceso inválido o expirado. Verifica el Access Token del agente.'
        }, { status: 401 });
      }

      if (apiError?.response?.status === 400) {
        const errorMessage = apiError?.response?.data?.error?.message || 'Error en la solicitud';
        const errorCode = apiError?.response?.data?.error?.code;
        
        return NextResponse.json({
          ok: false,
          error: `Error al crear plantilla: ${errorMessage}${errorCode ? ` (Código: ${errorCode})` : ''}`
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: false,
        error: apiError?.response?.data?.error?.message || 'Error al crear plantilla en WhatsApp Business API'
      }, { status: apiError?.response?.status || 500 });
    }

    // Procesar respuesta exitosa
    if (response.data) {
      return NextResponse.json({
        ok: true,
        message: 'Plantilla creada exitosamente. Debe ser aprobada por WhatsApp antes de poder usarse.',
        data: response.data
      });
    } else {
      return NextResponse.json({
        ok: false,
        error: 'La respuesta de la API no contiene los datos esperados'
      }, { status: 400 });
    }
  } catch (e: any) {
    console.error('[WHATSAPP CREATE TEMPLATE] Error:', e?.message || e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al procesar la solicitud' 
    }, { status: 500 });
  }
}


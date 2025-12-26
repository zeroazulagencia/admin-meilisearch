import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { query } from '@/utils/db';
import { decrypt } from '@/utils/encryption';
import { validateCriticalEnvVars } from '@/utils/validate-env';
import { meilisearchAPI } from '@/utils/meilisearch';

// Validar variables de entorno críticas al cargar el módulo
try {
  validateCriticalEnvVars();
} catch (error: any) {
  console.error('[API WHATSAPP SEND-MESSAGE] Error de validación de variables de entorno:', error.message);
}

// POST - Enviar mensaje a través de WhatsApp Business API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, phone_number, message_type = 'text', message, image_url, document_url, document_filename, caption, buttons, list_title, list_description, list_button_text, list_sections, template_name, template_language = 'es', template_components, user_id, phone_number_id } = body;

    if (!agent_id || !phone_number) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id y phone_number' 
      }, { status: 400 });
    }

    // Obtener configuración de WhatsApp del agente y conversation_agent_name
    const [rows] = await query<any>(
      'SELECT whatsapp_phone_number_id, whatsapp_access_token, conversation_agent_name FROM agents WHERE id = ? LIMIT 1',
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

    // Construir el payload según el tipo de mensaje
    let payload: any = {
      messaging_product: 'whatsapp',
      to: cleanPhoneNumber,
    };

    if (message_type === 'text') {
      if (!message) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Se requiere el campo message para mensajes de texto' 
        }, { status: 400 });
      }
      payload.type = 'text';
      payload.text = { body: message };
    } 
    else if (message_type === 'image') {
      if (!image_url) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Se requiere image_url para mensajes con imagen' 
        }, { status: 400 });
      }
      payload.type = 'image';
      payload.image = {
        link: image_url
      };
      if (caption) {
        payload.image.caption = caption;
      }
    }
    else if (message_type === 'document') {
      if (!document_url || !document_filename) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Se requiere document_url y document_filename para mensajes con documento' 
        }, { status: 400 });
      }
      payload.type = 'document';
      payload.document = {
        link: document_url,
        filename: document_filename
      };
      if (caption) {
        payload.document.caption = caption;
      }
    }
    else if (message_type === 'buttons') {
      if (!message || !buttons || !Array.isArray(buttons) || buttons.length === 0) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Se requiere message y al menos un botón válido' 
        }, { status: 400 });
      }
      // Validar que los botones tengan id y title
      const validButtons = buttons.filter(b => b.id && b.title);
      if (validButtons.length === 0) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Los botones deben tener id y title' 
        }, { status: 400 });
      }
      if (validButtons.length > 3) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Máximo 3 botones permitidos' 
        }, { status: 400 });
      }
      payload.type = 'interactive';
      payload.interactive = {
        type: 'button',
        body: {
          text: message
        },
        action: {
          buttons: validButtons.map((btn, idx) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title
            }
          }))
        }
      };
    }
    else if (message_type === 'list') {
      if (!list_title || !list_button_text || !list_sections || !Array.isArray(list_sections) || list_sections.length === 0) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Se requiere list_title, list_button_text y al menos una sección' 
        }, { status: 400 });
      }
      // Validar y formatear secciones
      const validSections = list_sections
        .filter((s: any) => s.title && s.rows && Array.isArray(s.rows) && s.rows.length > 0)
        .map((s: any) => ({
          title: s.title,
          rows: s.rows
            .filter((r: any) => r.id && r.title)
            .map((r: any) => ({
              id: r.id,
              title: r.title,
              description: r.description || ''
            }))
        }))
        .filter((s: any) => s.rows.length > 0);

      if (validSections.length === 0) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Debe haber al menos una sección con filas válidas (id y title)' 
        }, { status: 400 });
      }

      if (validSections.length > 10) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Máximo 10 secciones permitidas' 
        }, { status: 400 });
      }

      // Validar límites de filas por sección
      for (const section of validSections) {
        if (section.rows.length > 10) {
          return NextResponse.json({ 
            ok: false, 
            error: 'Máximo 10 filas por sección' 
          }, { status: 400 });
        }
      }

      payload.type = 'interactive';
      payload.interactive = {
        type: 'list',
        body: {
          text: list_description || list_title
        },
        action: {
          button: list_button_text,
          sections: validSections
        }
      };
    }
    else if (message_type === 'template') {
      if (!template_name) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Se requiere template_name para mensajes con plantilla' 
        }, { status: 400 });
      }
      
      payload.type = 'template';
      payload.template = {
        name: template_name,
        language: {
          code: template_language
        }
      };
      
      // Agregar componentes si están presentes
      if (template_components && Array.isArray(template_components) && template_components.length > 0) {
        payload.template.components = template_components.map((comp: any) => {
          const component: any = {
            type: comp.type || 'body'
          };
          
          if (comp.type === 'body' && comp.parameters) {
            component.parameters = comp.parameters.map((param: any) => {
              if (param.type === 'text') {
                return {
                  type: 'text',
                  text: param.text
                };
              } else if (param.type === 'currency') {
                return {
                  type: 'currency',
                  currency: {
                    fallback_value: param.currency?.fallback_value || param.text,
                    code: param.currency?.code || 'USD',
                    amount_1000: param.currency?.amount_1000 || 0
                  }
                };
              } else if (param.type === 'date_time') {
                return {
                  type: 'date_time',
                  date_time: {
                    fallback_value: param.date_time?.fallback_value || param.text
                  }
                };
              }
              return {
                type: 'text',
                text: param.text || String(param)
              };
            });
          } else if (comp.type === 'button' && comp.sub_type && comp.index !== undefined) {
            component.sub_type = comp.sub_type;
            component.index = comp.index;
            if (comp.parameters && comp.parameters.length > 0) {
              component.parameters = comp.parameters.map((param: any) => {
                if (param.type === 'payload') {
                  return {
                    type: 'payload',
                    payload: param.payload
                  };
                } else if (param.type === 'text') {
                  return {
                    type: 'text',
                    text: param.text
                  };
                }
                return {
                  type: 'text',
                  text: param.text || String(param)
                };
              });
            }
          }
          
          return component;
        });
      }
    }
    else {
      return NextResponse.json({ 
        ok: false, 
        error: `Tipo de mensaje no soportado: ${message_type}` 
      }, { status: 400 });
    }

    // Enviar mensaje a través de WhatsApp Business API
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.messages && response.data.messages.length > 0) {
        const messageId = response.data.messages[0].id;
        
        // Guardar mensaje en Meilisearch después de enviarlo exitosamente a WhatsApp
        // Solo si se proporcionaron user_id y phone_number_id (desde el chat en modo humano)
        if (user_id && phone_number_id && message_type === 'text' && message) {
          try {
            const conversationAgentName = agent.conversation_agent_name || '';
            
            // Construir documento para Meilisearch
            const meilisearchDocument = {
              agent: conversationAgentName,
              type: 'agent', // porque lo envía el agente/humano
              datetime: new Date().toISOString(),
              user_id: user_id,
              phone_id: phone_number_id,
              phone_number_id: phone_number_id,
              'message-AI': message, // mensaje enviado por el agente
              'message-Human': '', // vacío porque es mensaje enviado
              conversation_id: messageId // usar el message_id de WhatsApp como conversation_id
            };
            
            console.log('[WHATSAPP SEND MESSAGE] Guardando mensaje en Meilisearch:', {
              agent: conversationAgentName,
              user_id: user_id,
              phone_number_id: phone_number_id,
              message_length: message.length
            });
            
            // Guardar en Meilisearch
            const INDEX_UID = 'bd_conversations_dworkers';
            await meilisearchAPI.addDocuments(INDEX_UID, [meilisearchDocument]);
            
            console.log('[WHATSAPP SEND MESSAGE] Mensaje guardado exitosamente en Meilisearch');
          } catch (meilisearchError: any) {
            // Si falla el guardado en Meilisearch, loguear pero no fallar el envío a WhatsApp
            console.error('[WHATSAPP SEND MESSAGE] Error guardando en Meilisearch (no crítico):', meilisearchError?.message || meilisearchError);
            // Continuar con la respuesta exitosa del envío a WhatsApp
          }
        }
        
        return NextResponse.json({
          ok: true,
          message: 'Mensaje enviado exitosamente',
          data: {
            message_id: messageId,
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

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { encrypt, decrypt, maskSensitiveValue, isEncrypted } from '@/utils/encryption';

// GET - Listar todos los agentes
export async function GET() {
  try {
    console.log('[API AGENTS] [GET] Iniciando carga de agentes...');
    
    // Verificar qué columnas existen antes de intentar cargarlas
    let whatsappColumnsExist = false;
    let n8nDataTableIdExists = false;
    let reportsAgentNameExists = false;
    
    try {
      const [columnCheck] = await query<any>(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'agents' 
         AND COLUMN_NAME IN ('whatsapp_business_account_id', 'whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_webhook_verify_token', 'whatsapp_app_secret')`
      );
      whatsappColumnsExist = columnCheck && columnCheck.length > 0 && columnCheck[0].count === 5;
      console.log('[API AGENTS] [GET] Columnas de WhatsApp existen:', whatsappColumnsExist);
    } catch (checkError) {
      console.log('[API AGENTS] [GET] Error verificando columnas de WhatsApp:', checkError);
      whatsappColumnsExist = false;
    }
    
    try {
      const [n8nCheck] = await query<any>(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'agents' 
         AND COLUMN_NAME = 'n8n_data_table_id'`
      );
      n8nDataTableIdExists = n8nCheck && n8nCheck.length > 0 && n8nCheck[0].count === 1;
      console.log('[API AGENTS] [GET] Columna n8n_data_table_id existe:', n8nDataTableIdExists);
    } catch (checkError) {
      console.log('[API AGENTS] [GET] Error verificando columna n8n_data_table_id:', checkError);
      n8nDataTableIdExists = false;
    }
    
    try {
      const [reportsCheck] = await query<any>(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'agents' 
         AND COLUMN_NAME = 'reports_agent_name'`
      );
      reportsAgentNameExists = reportsCheck && reportsCheck.length > 0 && reportsCheck[0].count === 1;
      console.log('[API AGENTS] [GET] Columna reports_agent_name existe:', reportsAgentNameExists);
    } catch (checkError) {
      console.log('[API AGENTS] [GET] Error verificando columna reports_agent_name:', checkError);
      reportsAgentNameExists = false;
    }
    
    // Construir query base
    let baseFields = 'id, client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name';
    let queryFields = baseFields;
    
    // Agregar campos opcionales si existen
    if (reportsAgentNameExists) {
      queryFields += ', reports_agent_name';
    }
    if (whatsappColumnsExist) {
      queryFields += ', whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_webhook_verify_token, whatsapp_app_secret';
    }
    if (n8nDataTableIdExists) {
      queryFields += ', n8n_data_table_id';
    }
    
    console.log('[API AGENTS] [GET] Query fields:', queryFields);
    
    // Intentar cargar con los campos disponibles
    let rows: any[] = [];
    try {
      const [result] = await query<any>(`SELECT ${queryFields} FROM agents ORDER BY id`);
      rows = result || [];
      console.log('[API AGENTS] [GET] Agentes cargados exitosamente:', rows.length);
    } catch (e: any) {
      console.error('[API AGENTS] [GET] Error cargando agentes con query completa:', e?.message);
      
      // Si falla, intentar solo con campos base
      try {
        const [result] = await query<any>(`SELECT ${baseFields} FROM agents ORDER BY id`);
        rows = result || [];
        console.log('[API AGENTS] [GET] Agentes cargados con campos base:', rows.length);
      } catch (e2: any) {
        console.error('[API AGENTS] [GET] Error cargando agentes con campos base:', e2?.message);
        throw e2;
      }
    }
    
    // Si las columnas de WhatsApp existen pero no se cargaron, intentar cargarlas por separado
    if (whatsappColumnsExist && rows.length > 0) {
      const agentIds = rows.map((a: any) => a.id);
      try {
        const [whatsappRows] = await query<any>(
          `SELECT id, whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_webhook_verify_token, whatsapp_app_secret FROM agents WHERE id IN (${agentIds.map(() => '?').join(',')})`,
          agentIds
        );
        
        // Crear un mapa de datos de WhatsApp por ID
        const whatsappMap = new Map();
        whatsappRows.forEach((row: any) => {
          whatsappMap.set(row.id, {
            whatsapp_business_account_id: row.whatsapp_business_account_id,
            whatsapp_phone_number_id: row.whatsapp_phone_number_id,
            whatsapp_access_token: row.whatsapp_access_token,
            whatsapp_webhook_verify_token: row.whatsapp_webhook_verify_token,
            whatsapp_app_secret: row.whatsapp_app_secret
          });
        });
        
        // Combinar datos de WhatsApp con los agentes
        rows = rows.map((agent: any) => {
          const whatsappData = whatsappMap.get(agent.id);
          if (whatsappData) {
            return { ...agent, ...whatsappData };
          }
          return {
            ...agent,
            whatsapp_business_account_id: null,
            whatsapp_phone_number_id: null,
            whatsapp_access_token: null,
            whatsapp_webhook_verify_token: null,
            whatsapp_app_secret: null
          };
        });
        
        console.log('[API AGENTS] [GET] Datos de WhatsApp cargados por separado y combinados');
      } catch (whatsappError: any) {
        console.error('[API AGENTS] [GET] Error cargando datos de WhatsApp por separado:', whatsappError?.message);
        // Continuar sin datos de WhatsApp si falla
      }
    }
    
    // Enmascarar tokens de WhatsApp antes de enviar al frontend
    const agentsWithMaskedTokens = rows.map((agent: any) => {
      const maskedAgent = { ...agent };
      
      // Enmascarar whatsapp_access_token
      if (maskedAgent.whatsapp_access_token) {
        if (isEncrypted(maskedAgent.whatsapp_access_token)) {
          try {
            const decrypted = decrypt(maskedAgent.whatsapp_access_token);
            if (decrypted && decrypted.length > 0) {
              maskedAgent.whatsapp_access_token = decrypted.substring(0, 4) + '...';
            } else {
              console.error('[API AGENTS] [GET] whatsapp_access_token: Desencriptación devolvió vacío para agente ID:', maskedAgent.id);
              maskedAgent.whatsapp_access_token = maskSensitiveValue(maskedAgent.whatsapp_access_token, 4);
            }
          } catch (e: any) {
            console.error('[API AGENTS] [GET] whatsapp_access_token: Error al desencriptar para agente ID:', maskedAgent.id, e?.message);
            maskedAgent.whatsapp_access_token = maskSensitiveValue(maskedAgent.whatsapp_access_token, 4);
          }
        } else {
          maskedAgent.whatsapp_access_token = maskSensitiveValue(maskedAgent.whatsapp_access_token, 4);
        }
      }
      
      // Enmascarar whatsapp_webhook_verify_token
      if (maskedAgent.whatsapp_webhook_verify_token) {
        if (isEncrypted(maskedAgent.whatsapp_webhook_verify_token)) {
          try {
            const decrypted = decrypt(maskedAgent.whatsapp_webhook_verify_token);
            if (decrypted && decrypted.length > 0) {
              maskedAgent.whatsapp_webhook_verify_token = decrypted.substring(0, 4) + '...';
            } else {
              console.error('[API AGENTS] [GET] whatsapp_webhook_verify_token: Desencriptación devolvió vacío para agente ID:', maskedAgent.id);
              maskedAgent.whatsapp_webhook_verify_token = maskSensitiveValue(maskedAgent.whatsapp_webhook_verify_token, 4);
            }
          } catch (e: any) {
            console.error('[API AGENTS] [GET] whatsapp_webhook_verify_token: Error al desencriptar para agente ID:', maskedAgent.id, e?.message);
            maskedAgent.whatsapp_webhook_verify_token = maskSensitiveValue(maskedAgent.whatsapp_webhook_verify_token, 4);
          }
        } else {
          maskedAgent.whatsapp_webhook_verify_token = maskSensitiveValue(maskedAgent.whatsapp_webhook_verify_token, 4);
        }
      }
      
      // Enmascarar whatsapp_app_secret
      if (maskedAgent.whatsapp_app_secret) {
        if (isEncrypted(maskedAgent.whatsapp_app_secret)) {
          try {
            const decrypted = decrypt(maskedAgent.whatsapp_app_secret);
            if (decrypted && decrypted.length > 0) {
              maskedAgent.whatsapp_app_secret = decrypted.substring(0, 4) + '...';
            } else {
              console.error('[API AGENTS] [GET] whatsapp_app_secret: Desencriptación devolvió vacío para agente ID:', maskedAgent.id);
              maskedAgent.whatsapp_app_secret = maskSensitiveValue(maskedAgent.whatsapp_app_secret, 4);
            }
          } catch (e: any) {
            console.error('[API AGENTS] [GET] whatsapp_app_secret: Error al desencriptar para agente ID:', maskedAgent.id, e?.message);
            maskedAgent.whatsapp_app_secret = maskSensitiveValue(maskedAgent.whatsapp_app_secret, 4);
          }
        } else {
          maskedAgent.whatsapp_app_secret = maskSensitiveValue(maskedAgent.whatsapp_app_secret, 4);
        }
      }
      
      // Agregar campos faltantes como null si no existen
      if (!whatsappColumnsExist) {
        maskedAgent.whatsapp_business_account_id = null;
        maskedAgent.whatsapp_phone_number_id = null;
        maskedAgent.whatsapp_access_token = null;
        maskedAgent.whatsapp_webhook_verify_token = null;
        maskedAgent.whatsapp_app_secret = null;
      }
      if (!reportsAgentNameExists) {
        maskedAgent.reports_agent_name = null;
      }
      if (!n8nDataTableIdExists) {
        maskedAgent.n8n_data_table_id = null;
      }
      
      return maskedAgent;
    });
    
    console.log('[API AGENTS] [GET] Agentes procesados y enmascarados:', agentsWithMaskedTokens.length);
    return NextResponse.json({ ok: true, agents: agentsWithMaskedTokens });
  } catch (e: any) {
    console.error('[API AGENTS] [GET] Error loading agents:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al cargar agentes' }, { status: 500 });
  }
}

// POST - Crear nuevo agente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Encriptar tokens de WhatsApp si están presentes
    let encryptedAccessToken: string | null = null;
    let encryptedWebhookToken: string | null = null;
    let encryptedAppSecret: string | null = null;
    
    if (body.whatsapp_access_token) {
      try {
        encryptedAccessToken = encrypt(body.whatsapp_access_token);
      } catch (e: any) {
        console.error('[API AGENTS] Error encrypting access_token:', e?.message);
        return NextResponse.json({ ok: false, error: 'Error al encriptar access_token' }, { status: 500 });
      }
    }
    
    if (body.whatsapp_webhook_verify_token) {
      try {
        encryptedWebhookToken = encrypt(body.whatsapp_webhook_verify_token);
      } catch (e: any) {
        console.error('[API AGENTS] Error encrypting webhook_token:', e?.message);
        return NextResponse.json({ ok: false, error: 'Error al encriptar webhook_verify_token' }, { status: 500 });
      }
    }
    
    if (body.whatsapp_app_secret) {
      try {
        encryptedAppSecret = encrypt(body.whatsapp_app_secret);
      } catch (e: any) {
        console.error('[API AGENTS] Error encrypting app_secret:', e?.message);
        return NextResponse.json({ ok: false, error: 'Error al encriptar app_secret' }, { status: 500 });
      }
    }
    
    // Verificar si existen las columnas de WhatsApp
    let whatsappColumnsExist = false;
    try {
      const [columnCheck] = await query<any>(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'agents' 
         AND COLUMN_NAME IN ('whatsapp_business_account_id', 'whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_webhook_verify_token', 'whatsapp_app_secret')`
      );
      whatsappColumnsExist = columnCheck && columnCheck.length > 0 && columnCheck[0].count === 5;
    } catch (checkError) {
      console.log('[API AGENTS] Error checking WhatsApp columns:', checkError);
      whatsappColumnsExist = false;
    }
    
    // Intentar insertar con todos los campos si las columnas de WhatsApp existen
    if (whatsappColumnsExist) {
      try {
        const [result] = await query<any>(
          'INSERT INTO agents (client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name, reports_agent_name, whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_webhook_verify_token, whatsapp_app_secret) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            body.client_id,
            body.name,
            body.description || null,
            body.photo || null,
            body.email || null,
            body.phone || null,
            body.agent_code || null,
            'active',
            JSON.stringify(body.knowledge || {}),
            JSON.stringify(body.workflows || {}),
            body.conversation_agent_name || null,
            body.reports_agent_name || null,
            body.whatsapp_business_account_id || null,
            body.whatsapp_phone_number_id || null,
            encryptedAccessToken,
            encryptedWebhookToken,
            encryptedAppSecret
          ]
        );
        const insertResult = result as any;
        return NextResponse.json({ ok: true, id: insertResult?.insertId || 0 });
      } catch (e: any) {
        console.log('[API AGENTS] Error inserting with WhatsApp fields, trying without reports_agent_name:', e?.message);
        try {
          const [result] = await query<any>(
            'INSERT INTO agents (client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name, whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_webhook_verify_token, whatsapp_app_secret) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              body.client_id,
              body.name,
              body.description || null,
              body.photo || null,
              body.email || null,
              body.phone || null,
              body.agent_code || null,
              'active',
              JSON.stringify(body.knowledge || {}),
              JSON.stringify(body.workflows || {}),
              body.conversation_agent_name || null,
              body.whatsapp_business_account_id || null,
              body.whatsapp_phone_number_id || null,
              encryptedAccessToken,
              encryptedWebhookToken,
              encryptedAppSecret
            ]
          );
          const insertResult = result as any;
          return NextResponse.json({ ok: true, id: insertResult?.insertId || 0 });
        } catch (e2: any) {
          console.log('[API AGENTS] Error inserting with WhatsApp fields, trying without WhatsApp:', e2?.message);
          // Continuar con el flujo original sin WhatsApp
        }
      }
    }
    
    // Intentar sin campos de WhatsApp
    try {
      const [result] = await query<any>(
        'INSERT INTO agents (client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name, reports_agent_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          body.client_id,
          body.name,
          body.description || null,
          body.photo || null,
          body.email || null,
          body.phone || null,
          body.agent_code || null,
          'active',
          JSON.stringify(body.knowledge || {}),
          JSON.stringify(body.workflows || {}),
          body.conversation_agent_name || null,
          body.reports_agent_name || null
        ]
      );
      const insertResult = result as any;
      return NextResponse.json({ ok: true, id: insertResult?.insertId || 0 });
    } catch (e: any) {
      console.log('[API AGENTS] Error inserting with reports_agent_name, trying without it:', e?.message);
      const [result] = await query<any>(
        'INSERT INTO agents (client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          body.client_id,
          body.name,
          body.description || null,
          body.photo || null,
          body.email || null,
          body.phone || null,
          body.agent_code || null,
          'active',
          JSON.stringify(body.knowledge || {}),
          JSON.stringify(body.workflows || {}),
          body.conversation_agent_name || null
        ]
      );
      const insertResult = result as any;
      return NextResponse.json({ ok: true, id: insertResult?.insertId || 0 });
    }
  } catch (e: any) {
    console.error('[API AGENTS] Error creating agent:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al crear agente' }, { status: 500 });
  }
}

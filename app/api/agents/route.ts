import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { encrypt } from '@/utils/encryption';

// GET - Listar todos los agentes
export async function GET() {
  try {
    // Intentar cargar con todos los campos posibles, con manejo de errores para campos que pueden no existir
    try {
      const [rows] = await query<any>(
        'SELECT id, client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name, reports_agent_name, whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_webhook_verify_token, whatsapp_app_secret, n8n_data_table_id FROM agents ORDER BY id'
      );
      return NextResponse.json({ ok: true, agents: rows });
    } catch (e: any) {
      // Si falla, intentar sin campos opcionales
      console.log('[API AGENTS] Error loading with all fields, trying with basic fields:', e?.message);
      try {
        const [rows] = await query<any>(
          'SELECT id, client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name, reports_agent_name FROM agents ORDER BY id'
        );
        // Agregar campos faltantes como null para compatibilidad
        const agentsWithDefaults = rows.map((agent: any) => ({
          ...agent,
          whatsapp_business_account_id: null,
          whatsapp_phone_number_id: null,
          whatsapp_access_token: null,
          whatsapp_webhook_verify_token: null,
          whatsapp_app_secret: null,
          n8n_data_table_id: null
        }));
        return NextResponse.json({ ok: true, agents: agentsWithDefaults });
      } catch (e2: any) {
        // Si aún falla, intentar sin reports_agent_name
        console.log('[API AGENTS] Error with reports_agent_name, trying without it:', e2?.message);
        const [rows] = await query<any>(
          'SELECT id, client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name FROM agents ORDER BY id'
        );
        // Agregar campos faltantes como null para compatibilidad
        const agentsWithDefaults = rows.map((agent: any) => ({
          ...agent,
          reports_agent_name: null,
          whatsapp_business_account_id: null,
          whatsapp_phone_number_id: null,
          whatsapp_access_token: null,
          whatsapp_webhook_verify_token: null,
          whatsapp_app_secret: null,
          n8n_data_table_id: null
        }));
        return NextResponse.json({ ok: true, agents: agentsWithDefaults });
      }
    }
  } catch (e: any) {
    console.error('[API AGENTS] Error loading agents:', e?.message || e);
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

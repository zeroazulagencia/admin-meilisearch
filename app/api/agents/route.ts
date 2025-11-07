import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Listar todos los agentes
export async function GET() {
  try {
    // Intentar cargar con todos los campos posibles, con manejo de errores para campos que pueden no existir
    try {
      const [rows] = await query<any>(
        'SELECT id, client_id, name, description, photo, email, phone, agent_code, status, knowledge, workflows, conversation_agent_name, reports_agent_name, whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_webhook_verify_token, whatsapp_app_secret FROM agents ORDER BY id'
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
          whatsapp_app_secret: null
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
          whatsapp_app_secret: null
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
    // Primero intentar con reports_agent_name, si falla intentar sin él
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
      // Si falla, probablemente la columna reports_agent_name no existe, intentar sin ella
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

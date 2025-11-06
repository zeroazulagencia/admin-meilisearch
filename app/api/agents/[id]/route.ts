import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// GET - Obtener un agente por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Primero intentar con reports_agent_name, si falla intentar sin él
    try {
      const [rows] = await query<any>(
        'SELECT id, client_id, name, description, photo, status, knowledge, workflows, conversation_agent_name, reports_agent_name, whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_webhook_verify_token, whatsapp_app_secret FROM agents WHERE id = ? LIMIT 1',
        [id]
      );
      if (!rows || rows.length === 0) {
        return NextResponse.json({ ok: false, error: 'Agente no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, agent: rows[0] });
    } catch (e: any) {
      // Si falla, probablemente la columna reports_agent_name no existe, intentar sin ella
      console.log('[API AGENTS] Error with reports_agent_name, trying without it:', e?.message);
      const [rows] = await query<any>(
        'SELECT id, client_id, name, description, photo, status, knowledge, workflows, conversation_agent_name FROM agents WHERE id = ? LIMIT 1',
        [id]
      );
      if (!rows || rows.length === 0) {
        return NextResponse.json({ ok: false, error: 'Agente no encontrado' }, { status: 404 });
      }
      // Agregar campos faltantes como null para compatibilidad
      return NextResponse.json({ 
        ok: true, 
        agent: { 
          ...rows[0], 
          reports_agent_name: null,
          whatsapp_business_account_id: null,
          whatsapp_phone_number_id: null,
          whatsapp_access_token: null,
          whatsapp_webhook_verify_token: null,
          whatsapp_app_secret: null
        } 
      });
    }
  } catch (e: any) {
    console.error('[API AGENTS] Error loading agent:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al cargar agente' }, { status: 500 });
  }
}

// PUT - Actualizar un agente
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    console.log('[API AGENTS] PUT request body:', JSON.stringify(body, null, 2));
    console.log('[API AGENTS] reports_agent_name value:', body.reports_agent_name);
    
    // Primero intentar con todos los campos (reports_agent_name y WhatsApp), si falla intentar sin WhatsApp
    try {
      await query(
        'UPDATE agents SET client_id = ?, name = ?, description = ?, photo = ?, knowledge = ?, workflows = ?, conversation_agent_name = ?, reports_agent_name = ?, whatsapp_business_account_id = ?, whatsapp_phone_number_id = ?, whatsapp_access_token = ?, whatsapp_webhook_verify_token = ?, whatsapp_app_secret = ? WHERE id = ?',
        [
          body.client_id,
          body.name,
          body.description || null,
          body.photo || null,
          JSON.stringify(body.knowledge || {}),
          JSON.stringify(body.workflows || {}),
          body.conversation_agent_name || null,
          body.reports_agent_name || null,
          body.whatsapp_business_account_id || null,
          body.whatsapp_phone_number_id || null,
          body.whatsapp_access_token || null,
          body.whatsapp_webhook_verify_token || null,
          body.whatsapp_app_secret || null,
          id
        ]
      );
      console.log('[API AGENTS] Successfully updated with all fields');
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      // Si falla, probablemente las columnas de WhatsApp no existen, intentar sin ellas pero con reports_agent_name
      console.log('[API AGENTS] Error updating with WhatsApp fields, trying without them:', e?.message);
      
      try {
        await query(
          'UPDATE agents SET client_id = ?, name = ?, description = ?, photo = ?, knowledge = ?, workflows = ?, conversation_agent_name = ?, reports_agent_name = ? WHERE id = ?',
          [
            body.client_id,
            body.name,
            body.description || null,
            body.photo || null,
            JSON.stringify(body.knowledge || {}),
            JSON.stringify(body.workflows || {}),
            body.conversation_agent_name || null,
            body.reports_agent_name || null,
            id
          ]
        );
        console.log('[API AGENTS] Successfully updated with reports_agent_name (without WhatsApp fields)');
        return NextResponse.json({ 
          ok: true, 
          warning: 'Las columnas de WhatsApp no existen en la base de datos. Ejecuta la migración SQL para habilitar esta funcionalidad.' 
        });
      } catch (e2: any) {
        // Si también falla, probablemente reports_agent_name no existe
        console.log('[API AGENTS] Error updating with reports_agent_name, trying without it:', e2?.message);
        
        await query(
          'UPDATE agents SET client_id = ?, name = ?, description = ?, photo = ?, knowledge = ?, workflows = ?, conversation_agent_name = ? WHERE id = ?',
          [
            body.client_id,
            body.name,
            body.description || null,
            body.photo || null,
            JSON.stringify(body.knowledge || {}),
            JSON.stringify(body.workflows || {}),
            body.conversation_agent_name || null,
            id
          ]
        );
        
        return NextResponse.json({ 
          ok: true, 
          warning: 'Las columnas reports_agent_name y WhatsApp no existen en la base de datos. Ejecuta las migraciones SQL para habilitar esta funcionalidad.' 
        });
      }
    }
  } catch (e: any) {
    console.error('[API AGENTS] Error updating agent:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error al actualizar agente' }, { status: 500 });
  }
}

// DELETE - Eliminar un agente
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query('DELETE FROM agents WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}

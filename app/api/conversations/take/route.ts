import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { n8nAPI } from '@/utils/n8n';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, user_id, phone_number_id, taken_by } = body;

    if (!agent_id || !user_id || !phone_number_id || !taken_by) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id, user_id, phone_number_id y taken_by' 
      }, { status: 400 });
    }

    // Validar que el agente tenga configuración de WhatsApp
    const [agentRows] = await query<any>(
      'SELECT whatsapp_phone_number_id, whatsapp_access_token, workflows FROM agents WHERE id = ? LIMIT 1',
      [agent_id]
    );

    if (!agentRows || agentRows.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Agente no encontrado' 
      }, { status: 404 });
    }

    const agent = agentRows[0];
    
    if (!agent.whatsapp_phone_number_id || !agent.whatsapp_access_token) {
      return NextResponse.json({ 
        ok: false, 
        error: 'El agente no tiene configuración completa de WhatsApp' 
      }, { status: 400 });
    }

    // Verificar que no esté ya tomada por otro usuario
    const [existingRows] = await query<any>(
      `SELECT id, taken_by, taken_at FROM human_conversations 
       WHERE agent_id = ? AND user_id = ? AND phone_number_id = ? AND status = 'active' 
       LIMIT 1`,
      [agent_id, user_id, phone_number_id]
    );

    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0];
      if (existing.taken_by !== taken_by) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Esta conversación ya está siendo atendida por otro usuario',
          takenBy: existing.taken_by,
          takenAt: existing.taken_at
        }, { status: 409 }); // 409 Conflict
      }
      // Si ya está tomada por el mismo usuario, retornar éxito
      return NextResponse.json({ 
        ok: true, 
        message: 'Conversación ya está en modo humano',
        conversationId: existing.id
      });
    }

    // Insertar registro en human_conversations
    const [result] = await query<any>(
      `INSERT INTO human_conversations (agent_id, user_id, phone_number_id, taken_by, status) 
       VALUES (?, ?, ?, ?, 'active')`,
      [agent_id, user_id, phone_number_id, taken_by]
    );

    const insertResult = result as any;
    const conversationId = insertResult?.insertId;

    // Intentar desactivar workflows del agente (opcional, no crítico si falla)
    try {
      if (agent.workflows) {
        const workflows = typeof agent.workflows === 'string' 
          ? JSON.parse(agent.workflows) 
          : (agent.workflows || {});
        const workflowIds = Array.isArray(workflows.workflowIds) ? workflows.workflowIds : [];
        
        // Desactivar todos los workflows del agente
        for (const workflowId of workflowIds) {
          try {
            await n8nAPI.deactivateWorkflow(workflowId);
            console.log(`[CONVERSATIONS TAKE] Workflow ${workflowId} desactivado para agente ${agent_id}`);
          } catch (workflowError: any) {
            console.warn(`[CONVERSATIONS TAKE] No se pudo desactivar workflow ${workflowId}:`, workflowError.message);
            // Continuar con los demás workflows aunque uno falle
          }
        }
      }
    } catch (workflowError: any) {
      console.warn('[CONVERSATIONS TAKE] Error al desactivar workflows (no crítico):', workflowError.message);
      // No fallar la operación si no se pueden desactivar los workflows
    }

    console.log(`[CONVERSATIONS TAKE] Conversación tomada: agent_id=${agent_id}, user_id=${user_id}, taken_by=${taken_by}`);

    return NextResponse.json({ 
      ok: true, 
      message: 'Conversación tomada exitosamente',
      conversationId
    });
  } catch (e: any) {
    console.error('[CONVERSATIONS TAKE] Error:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al tomar la conversación' 
    }, { status: 500 });
  }
}


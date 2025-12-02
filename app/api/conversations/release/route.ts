import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { n8nAPI } from '@/utils/n8n';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, user_id, phone_number_id } = body;

    if (!agent_id || !user_id || !phone_number_id) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id, user_id y phone_number_id' 
      }, { status: 400 });
    }

    // Verificar que la conversación esté en modo humano
    const [existingRows] = await query<any>(
      `SELECT id, taken_by FROM human_conversations 
       WHERE agent_id = ? AND user_id = ? AND phone_number_id = ? AND status = 'active' 
       LIMIT 1`,
      [agent_id, user_id, phone_number_id]
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Esta conversación no está en modo humano' 
      }, { status: 404 });
    }

    // Actualizar registro en human_conversations
    await query(
      `UPDATE human_conversations 
       SET status = 'released', released_at = CURRENT_TIMESTAMP 
       WHERE agent_id = ? AND user_id = ? AND phone_number_id = ? AND status = 'active'`,
      [agent_id, user_id, phone_number_id]
    );

    // Intentar reactivar workflows del agente (opcional, no crítico si falla)
    try {
      const [agentRows] = await query<any>(
        'SELECT workflows FROM agents WHERE id = ? LIMIT 1',
        [agent_id]
      );

      if (agentRows && agentRows.length > 0) {
        const agent = agentRows[0];
        if (agent.workflows) {
          const workflows = typeof agent.workflows === 'string' 
            ? JSON.parse(agent.workflows) 
            : (agent.workflows || {});
          const workflowIds = Array.isArray(workflows.workflowIds) ? workflows.workflowIds : [];
          
          // Reactivar todos los workflows del agente
          for (const workflowId of workflowIds) {
            try {
              await n8nAPI.activateWorkflow(workflowId);
              console.log(`[CONVERSATIONS RELEASE] Workflow ${workflowId} reactivado para agente ${agent_id}`);
            } catch (workflowError: any) {
              console.warn(`[CONVERSATIONS RELEASE] No se pudo reactivar workflow ${workflowId}:`, workflowError.message);
              // Continuar con los demás workflows aunque uno falle
            }
          }
        }
      }
    } catch (workflowError: any) {
      console.warn('[CONVERSATIONS RELEASE] Error al reactivar workflows (no crítico):', workflowError.message);
      // No fallar la operación si no se pueden reactivar los workflows
    }

    console.log(`[CONVERSATIONS RELEASE] Conversación liberada: agent_id=${agent_id}, user_id=${user_id}`);

    return NextResponse.json({ 
      ok: true, 
      message: 'Conversación liberada exitosamente'
    });
  } catch (e: any) {
    console.error('[CONVERSATIONS RELEASE] Error:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al liberar la conversación' 
    }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { n8nAPI } from '@/utils/n8n';

export async function POST(req: NextRequest) {
  try {
    // Verificar y crear la tabla human_conversations si no existe
    try {
      const [tableCheck] = await query<any>(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'human_conversations'`
      );
      
      if (!tableCheck || tableCheck.length === 0 || tableCheck[0].count === 0) {
        console.log('[CONVERSATIONS RELEASE] Tabla human_conversations no existe, creándola...');
        await query(`
          CREATE TABLE IF NOT EXISTS human_conversations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            agent_id INT NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            phone_number_id VARCHAR(255) NOT NULL,
            taken_by INT NOT NULL,
            taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            released_at TIMESTAMP NULL,
            status ENUM('active', 'released') DEFAULT 'active',
            INDEX idx_agent_id (agent_id),
            INDEX idx_user_id (user_id),
            INDEX idx_phone_number_id (phone_number_id),
            INDEX idx_status (status),
            INDEX idx_taken_by (taken_by),
            INDEX idx_taken_at (taken_at),
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (taken_by) REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[CONVERSATIONS RELEASE] Tabla human_conversations creada exitosamente');
      }
    } catch (tableError: any) {
      console.error('[CONVERSATIONS RELEASE] Error verificando/creando tabla human_conversations:', tableError?.message);
      // Continuar aunque falle la verificación, intentar usar la tabla
    }
    
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


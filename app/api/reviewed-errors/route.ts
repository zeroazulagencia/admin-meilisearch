import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { getUserId } from '@/utils/permissions';

// GET - Obtener todos los errores revisados
export async function GET(req: NextRequest) {
  try {
    const [rows] = await query<any>(
      'SELECT execution_id, workflow_id, agent_id, reviewed_at FROM reviewed_errors ORDER BY reviewed_at DESC'
    );
    
    return NextResponse.json({ 
      ok: true, 
      reviewedErrors: rows || [] 
    });
  } catch (e: any) {
    console.error('[REVIEWED-ERRORS] Error obteniendo errores revisados:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al obtener errores revisados' 
    }, { status: 500 });
  }
}

// POST - Marcar un error como revisado
export async function POST(req: NextRequest) {
  try {
    const { executionId, workflowId, agentId } = await req.json();
    
    if (!executionId || !workflowId || !agentId) {
      return NextResponse.json({ 
        ok: false, 
        error: 'executionId, workflowId y agentId son requeridos' 
      }, { status: 400 });
    }
    
    const userId = getUserId();
    
    // Insertar o actualizar (usando INSERT ... ON DUPLICATE KEY UPDATE)
    await query(
      `INSERT INTO reviewed_errors (execution_id, workflow_id, agent_id, reviewed_by) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         reviewed_at = CURRENT_TIMESTAMP,
         reviewed_by = ?`,
      [executionId, workflowId, agentId, userId, userId]
    );
    
    console.log(`[REVIEWED-ERRORS] Error marcado como revisado: executionId=${executionId}, workflowId=${workflowId}, agentId=${agentId}`);
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Error marcado como revisado exitosamente' 
    });
  } catch (e: any) {
    console.error('[REVIEWED-ERRORS] Error marcando error como revisado:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al marcar error como revisado' 
    }, { status: 500 });
  }
}

// DELETE - Desmarcar un error como revisado (opcional, para poder revisar de nuevo)
export async function DELETE(req: NextRequest) {
  try {
    const { executionId } = await req.json();
    
    if (!executionId) {
      return NextResponse.json({ 
        ok: false, 
        error: 'executionId es requerido' 
      }, { status: 400 });
    }
    
    await query(
      'DELETE FROM reviewed_errors WHERE execution_id = ?',
      [executionId]
    );
    
    console.log(`[REVIEWED-ERRORS] Error desmarcado como revisado: executionId=${executionId}`);
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Error desmarcado como revisado exitosamente' 
    });
  } catch (e: any) {
    console.error('[REVIEWED-ERRORS] Error desmarcando error como revisado:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al desmarcar error como revisado' 
    }, { status: 500 });
  }
}


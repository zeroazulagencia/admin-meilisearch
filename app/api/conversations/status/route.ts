import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const agent_id = searchParams.get('agent_id');
    const user_id = searchParams.get('user_id');
    const phone_number_id = searchParams.get('phone_number_id');

    if (!agent_id || !user_id || !phone_number_id) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Se requiere agent_id, user_id y phone_number_id' 
      }, { status: 400 });
    }

    // Verificar si la conversación está en modo humano
    const [rows] = await query<any>(
      `SELECT id, taken_by, taken_at, status 
       FROM human_conversations 
       WHERE agent_id = ? AND user_id = ? AND phone_number_id = ? AND status = 'active' 
       LIMIT 1`,
      [agent_id, user_id, phone_number_id]
    );

    if (rows && rows.length > 0) {
      const conversation = rows[0];
      return NextResponse.json({ 
        ok: true, 
        isHumanMode: true,
        takenBy: conversation.taken_by,
        takenAt: conversation.taken_at,
        conversationId: conversation.id
      });
    }

    return NextResponse.json({ 
      ok: true, 
      isHumanMode: false
    });
  } catch (e: any) {
    console.error('[CONVERSATIONS STATUS] Error:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Error al verificar estado de la conversación' 
    }, { status: 500 });
  }
}


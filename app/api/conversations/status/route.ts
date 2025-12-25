import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET(req: NextRequest) {
  try {
    // Verificar y crear la tabla human_conversations si no existe
    try {
      const [tableCheck] = await query<any>(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'human_conversations'`
      );
      
      if (!tableCheck || tableCheck.length === 0 || tableCheck[0].count === 0) {
        console.log('[CONVERSATIONS STATUS] Tabla human_conversations no existe, creándola...');
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
        console.log('[CONVERSATIONS STATUS] Tabla human_conversations creada exitosamente');
      }
    } catch (tableError: any) {
      console.error('[CONVERSATIONS STATUS] Error verificando/creando tabla human_conversations:', tableError?.message);
      // Continuar aunque falle la verificación, intentar usar la tabla
    }
    
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


import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

// POST - Marcar conversación como leída
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, user_id, phone_number_id, last_message_datetime } = body;
    const read_by = body.read_by; // client_id del usuario

    if (!agent_id || !user_id || !read_by) {
      return NextResponse.json({ ok: false, error: 'Faltan campos requeridos' }, { status: 400 });
    }

    console.log('[OMNICANALIDAD MARK-READ] Marcando como leído:', {
      agent_id,
      user_id,
      phone_number_id,
      read_by,
      last_message_datetime
    });

    // Verificar y crear tabla si no existe
    try {
      const [tableCheck] = await query<any>(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'conversation_reads'`
      );

      if (!tableCheck || tableCheck.length === 0 || tableCheck[0].count === 0) {
        console.log('[OMNICANALIDAD MARK-READ] Tabla conversation_reads no existe, creándola...');
        await query(`
          CREATE TABLE IF NOT EXISTS conversation_reads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            agent_id INT NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            phone_number_id VARCHAR(255) NOT NULL,
            read_by INT NOT NULL,
            last_read_datetime TIMESTAMP NULL,
            last_message_datetime TIMESTAMP NOT NULL,
            unread_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_conversation_read (agent_id, user_id, phone_number_id, read_by),
            INDEX idx_agent_id (agent_id),
            INDEX idx_user_id (user_id),
            INDEX idx_phone_number_id (phone_number_id),
            INDEX idx_read_by (read_by),
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (read_by) REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
    } catch (tableError: any) {
      console.error('[OMNICANALIDAD MARK-READ] Error verificando/creando tabla:', tableError?.message);
    }

    const phoneId = phone_number_id || '';
    const lastMessageDt = last_message_datetime || new Date().toISOString();

    // INSERT o UPDATE usando ON DUPLICATE KEY UPDATE
    await query(
      `INSERT INTO conversation_reads 
       (agent_id, user_id, phone_number_id, read_by, last_read_datetime, last_message_datetime, unread_count)
       VALUES (?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
       last_read_datetime = VALUES(last_read_datetime),
       last_message_datetime = VALUES(last_message_datetime),
       unread_count = 0,
       updated_at = CURRENT_TIMESTAMP`,
      [agent_id, user_id, phoneId, read_by, lastMessageDt, lastMessageDt]
    );

    console.log('[OMNICANALIDAD MARK-READ] Conversación marcada como leída exitosamente');

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[OMNICANALIDAD MARK-READ] Error:', e?.message);
    return NextResponse.json({ ok: false, error: e?.message || 'Error marcando como leído' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await query<any>(
      'SELECT id, log_data, created_at FROM modulos_mobilia_14_logs ORDER BY id DESC LIMIT 50',
      []
    );
    
    const logs = (rows || []).map((row: any) => {
      try {
        return { id: row.id, created_at: row.created_at, ...JSON.parse(row.log_data || '{}') };
      } catch {
        return { id: row.id, created_at: row.created_at, raw: row.log_data };
      }
    });
    
    return NextResponse.json({ ok: true, logs });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
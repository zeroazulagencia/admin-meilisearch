import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [statusRows] = await query<any>(
      `SELECT status, COUNT(*) as count, SUM(amount_in_cents) as total_cents
       FROM modulos_autolarte_16_logs
       GROUP BY status ORDER BY count DESC`
    );

    const [lastSync] = await query<any>(
      'SELECT MAX(synced_at) as last_sync, COUNT(*) as total FROM modulos_autolarte_16_logs'
    );

    const [dailyRows] = await query<any>(
      `SELECT DATE(created_at_wompi) as day, COUNT(*) as count,
              SUM(CASE WHEN status='APPROVED' THEN amount_in_cents ELSE 0 END) as approved_cents
       FROM modulos_autolarte_16_logs
       WHERE created_at_wompi >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at_wompi)
       ORDER BY day DESC`
    );

    return NextResponse.json({
      ok: true,
      byStatus: statusRows,
      lastSync: (lastSync as any)[0]?.last_sync || null,
      total: (lastSync as any)[0]?.total || 0,
      last30Days: dailyRows,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

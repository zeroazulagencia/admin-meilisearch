import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const year = req.nextUrl.searchParams.get('year');
    const month = req.nextUrl.searchParams.get('month');

    let where = '';
    const params: any[] = [];

    if (year) {
      where += ' AND YEAR(created_at) = ?';
      params.push(parseInt(year));
    }
    if (month) {
      where += ' AND MONTH(created_at) = ?';
      params.push(parseInt(month));
    }

    const [rows] = await query<any>(
      `SELECT id, room_id, estado, creado_por, cliente_id, inicio_llamada, fin_llamada, duracion_segundos, recording_url, created_at, updated_at
       FROM modulos_sara_11_llamadas
       WHERE 1=1 ${where}
       ORDER BY created_at DESC`,
      params
    );

    const [statsRows] = await query<any>(
      `SELECT
         COUNT(*) as total_llamadas,
         COALESCE(SUM(duracion_segundos), 0) as total_segundos,
         COALESCE(AVG(duracion_segundos), 0) as promedio_segundos
       FROM modulos_sara_11_llamadas
       WHERE estado = 'finalizada' ${where}`,
      params
    );

    const stats = statsRows[0] || { total_llamadas: 0, total_segundos: 0, promedio_segundos: 0 };

    return NextResponse.json({
      ok: true,
      llamadas: rows,
      stats: {
        total_llamadas: stats.total_llamadas,
        total_minutos: Math.round((stats.total_segundos / 60) * 100) / 100,
        promedio_segundos: Math.round(stats.promedio_segundos),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

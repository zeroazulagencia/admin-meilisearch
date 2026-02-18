import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const [rows] = await query<any>(
      `SELECT id, empleado_nombre, empleado_cedula, empleado_cargo, empleado_salario,
              estado, solicitado_via, created_at
       FROM modulos_lucas_9_cartas
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await query<any>('SELECT COUNT(*) as total FROM modulos_lucas_9_cartas');

    return NextResponse.json({ ok: true, cartas: rows, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

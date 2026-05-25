import { NextResponse } from 'next/server';
import { getStats } from '@/utils/modulos/monitor-web-cfa-18/logs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json({ ok: true, ...stats });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error al obtener estadísticas' }, { status: 500 });
  }
}
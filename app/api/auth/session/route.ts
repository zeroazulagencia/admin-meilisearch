import { NextRequest, NextResponse } from 'next/server';
import { leerSesion } from '@/utils/session';

export const dynamic = 'force-dynamic';

// AuthProvider lo consulta para saber si la cookie de sesión sigue viva.
export async function GET(req: NextRequest) {
  const userId = leerSesion(req);
  if (!userId) return NextResponse.json({ ok: false, error: 'Sin sesión' }, { status: 401 });
  return NextResponse.json({ ok: true, userId });
}

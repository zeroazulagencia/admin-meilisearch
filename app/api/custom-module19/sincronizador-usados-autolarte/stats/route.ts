import { NextResponse } from 'next/server';
import { getStats } from '@/utils/modulos/sincronizador-usados-autolarte-19/logs';
import { getConfig } from '@/utils/modulos/sincronizador-usados-autolarte-19/config';

export async function GET() {
  const stats = await getStats();
  const ultimaSync = await getConfig('ultima_sincronizacion');
  return NextResponse.json({ ok: true, stats: { ...stats, ultimaSync } });
}
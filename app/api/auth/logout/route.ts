import { NextResponse } from 'next/server';
import { borrarCookieSesion } from '@/utils/session';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  borrarCookieSesion(res);
  return res;
}

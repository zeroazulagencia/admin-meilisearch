import { NextRequest, NextResponse } from 'next/server';
import { hmacHex, igualSeguro } from '@/utils/server-secret';

// Sesión del panel: cookie httpOnly firmada `uid.exp.firma` que emite el login.
// Sustituye a la cabecera x-admin-user-id, que cualquiera podía fabricar.

export const SESSION_COOKIE = 'admin_session';
const DURACION_S = 24 * 60 * 60; // igual que la expiración de AuthProvider
const PROPOSITO = 'panel-sesion-v1';

function firmar(uid: number, exp: number): string {
  return hmacHex(PROPOSITO, `${uid}.${exp}`);
}

export function crearSesion(uid: number): string {
  const exp = Math.floor(Date.now() / 1000) + DURACION_S;
  return `${uid}.${exp}.${firmar(uid, exp)}`;
}

/** Devuelve el id del usuario si la cookie es válida y no ha caducado; si no, null. */
export function leerSesion(req: NextRequest): number | null {
  const valor = req.cookies.get(SESSION_COOKIE)?.value;
  if (!valor) return null;

  const [uidTxt, expTxt, firma] = valor.split('.');
  const uid = Number(uidTxt);
  const exp = Number(expTxt);
  if (!Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(exp) || !firma) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;

  try {
    return igualSeguro(firmar(uid, exp), firma) ? uid : null;
  } catch {
    return null;
  }
}

export function ponerCookieSesion(res: NextResponse, uid: number): void {
  res.cookies.set(SESSION_COOKIE, crearSesion(uid), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: DURACION_S,
  });
}

export function borrarCookieSesion(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

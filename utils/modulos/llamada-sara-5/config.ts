import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/utils/api-auth';
import { query } from '@/utils/db';

// Configuración del módulo 5 (Llamada SARA), tabla modulos_sara_11_config.
export async function leerConfigSara(): Promise<Record<string, string>> {
  const [rows] = await query<any>('SELECT config_key, config_value FROM modulos_sara_11_config');
  return Object.fromEntries(rows.map((r: any) => [r.config_key, r.config_value ?? '']));
}

export function authTwilio(config: Record<string, string>): string {
  return 'Basic ' + Buffer.from(`${config.api_key_sid}:${config.api_key_secret}`).toString('base64');
}

/** Solo URLs de grabaciones de nuestra cuenta en la API de Twilio. */
export function esUrlGrabacionPropia(url: string, accountSid: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === 'https:' &&
      u.hostname === 'api.twilio.com' &&
      !!accountSid &&
      u.pathname.startsWith(`/2010-04-01/Accounts/${accountSid}/Recordings/`)
    );
  } catch {
    return false;
  }
}

/** Rutas del asesor: cualquier usuario con sesión del panel (o Bearer de servicio). */
export async function requireSesion(req: NextRequest): Promise<NextResponse | null> {
  const auth = await requireAuth(req);
  return auth instanceof NextResponse ? auth : null;
}

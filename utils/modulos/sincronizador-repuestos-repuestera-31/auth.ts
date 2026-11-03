import { NextRequest } from 'next/server';
import { igualSeguro } from '@/utils/server-secret';

/** Valida un secreto compartido en tiempo constante. Sin secreto configurado no se deja pasar nada. */
export function secretoValido(recibido: string | null | undefined, esperado: string): boolean {
  if (!esperado || !recibido) return false;
  return igualSeguro(recibido, esperado);
}

export function tokenDePlugin(req: NextRequest): string | null {
  return req.headers.get('x-sync-token');
}

export function secretoDeCron(req: NextRequest): string | null {
  return req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
}

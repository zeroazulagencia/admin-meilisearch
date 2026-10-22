import crypto from 'crypto';

/**
 * Clave HMAC derivada para un propósito concreto (sesiones, tokens públicos...).
 * Usa SESSION_SECRET si existe; si no, se deriva de ENCRYPTION_KEY. Cada propósito
 * obtiene una clave distinta, así un token de un uso no vale para otro.
 */
export function claveDerivada(proposito: string): Buffer {
  const base = process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY;
  if (!base) throw new Error('Falta SESSION_SECRET o ENCRYPTION_KEY');
  return crypto.createHmac('sha256', base).update(`dworkers:${proposito}`).digest();
}

export function hmacHex(proposito: string, dato: string): string {
  return crypto.createHmac('sha256', claveDerivada(proposito)).update(dato).digest('hex');
}

/** Comparación en tiempo constante de dos strings hex/ascii. */
export function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

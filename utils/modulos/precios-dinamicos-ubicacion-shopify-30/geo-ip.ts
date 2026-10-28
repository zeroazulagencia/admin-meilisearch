import path from 'node:path';
import maxmind, { AsnResponse, CityResponse, Reader } from 'maxmind';

// ============================================================
//  Módulo 30 — Geolocalización por IP (compartido por /geo/ y /checkout/)
//
//  IP CONFIABLE (crítico, ver auditoría 2026-10-21):
//  Este servidor NO está detrás de Cloudflare. El único salto de proxy es el
//  nginx local (workers.zeroazul.com -> 127.0.0.1:8988), que SOBRESCRIBE
//  `X-Real-IP` con `$remote_addr` (el peer TCP real). Por tanto:
//    - `X-Real-IP`  -> CONFIABLE (lo pone nuestro nginx).
//    - último valor de `X-Forwarded-For` -> CONFIABLE parcialmente: nginx usa
//      `$proxy_add_x_forwarded_for`, que AÑADE el peer al final de lo que mande
//      el cliente, así que el ÚLTIMO elemento siempre es el real.
//    - `X-Forwarded-For[0]` -> NO confiable (lo controla el cliente).
//    - `CF-Connecting-IP`   -> NO CONFIABLE: nadie lo pone (no hay Cloudflare),
//      así que un cliente puede enviarlo y elegir su ciudad → su descuento.
//  La app escucha SOLO en 127.0.0.1, así que la única vía pública es nginx,
//  que garantiza estas cabeceras.
// ============================================================

export interface Ubicacion {
  ciudad: string | null;
  region: string | null;
  pais: string | null;
  latitud: number | null;
  longitud: number | null;
}

const MMDB_PATH = path.join(process.cwd(), 'data', 'geoip', 'GeoLite2-City.mmdb');
// ASN: DB-IP "IP to ASN Lite" (CC BY 4.0, formato mmdb). Ver README del módulo.
const ASN_MMDB_PATH = path.join(process.cwd(), 'data', 'geoip', 'dbip-asn-lite.mmdb');

let readerPromise: Promise<Reader<CityResponse>> | null = null;
let asnReaderPromise: Promise<Reader<AsnResponse>> | null = null;

export function getReader(): Promise<Reader<CityResponse>> {
  if (!readerPromise) {
    readerPromise = maxmind.open<CityResponse>(MMDB_PATH).catch((err) => {
      readerPromise = null;
      throw err;
    });
  }
  return readerPromise;
}

function getAsnReader(): Promise<Reader<AsnResponse>> {
  if (!asnReaderPromise) {
    asnReaderPromise = maxmind.open<AsnResponse>(ASN_MMDB_PATH).catch((err) => {
      asnReaderPromise = null;
      throw err;
    });
  }
  return asnReaderPromise;
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-fA-F:]+$/;

export function esIp(valor: string | null | undefined): boolean {
  if (!valor) return false;
  const s = valor.trim();
  if (!s) return false;
  if (IPV4.test(s)) {
    return s.split('.').every((o) => {
      const n = Number(o);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }
  return IPV6.test(s) && s.includes(':');
}

/**
 * Devuelve la IP real del visitante usando SOLO cabeceras confiables.
 * Nunca lanza: si no hay nada confiable devuelve null.
 */
export function ipConfiable(headers: Headers): string | null {
  const xri = headers.get('x-real-ip');
  if (esIp(xri)) return xri!.trim();

  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const partes = xff
      .split(',')
      .map((p) => p.trim())
      .filter((p) => esIp(p));
    // El último es el que añade nginx (= peer TCP real).
    if (partes.length > 0) return partes[partes.length - 1];
  }

  return null;
}

export async function ubicarIp(ip: string | null): Promise<Ubicacion> {
  const vacio: Ubicacion = { ciudad: null, region: null, pais: null, latitud: null, longitud: null };
  if (!ip) return vacio;

  try {
    const reader = await getReader();
    const r = reader.get(ip);
    if (!r) return vacio;
    return {
      ciudad: r.city?.names?.es ?? r.city?.names?.en ?? null,
      region: r.subdivisions?.[0]?.names?.es ?? r.subdivisions?.[0]?.names?.en ?? null,
      pais: r.country?.iso_code ?? null,
      latitud: r.location?.latitude ?? null,
      longitud: r.location?.longitude ?? null,
    };
  } catch (err) {
    console.error('[geo-ip] error resolviendo ubicación:', err);
    return vacio;
  }
}

/** Número de ASN de la IP, o null si no se conoce. Nunca lanza. */
export async function asnDeIp(ip: string | null): Promise<number | null> {
  if (!ip) return null;
  try {
    const reader = await getAsnReader();
    return reader.get(ip)?.autonomous_system_number ?? null;
  } catch (err) {
    console.error('[geo-ip] error resolviendo ASN:', err);
    return null;
  }
}

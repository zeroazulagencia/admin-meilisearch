import { asnDeIp, ubicarIp, type Ubicacion } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/geo-ip';
import { municipioPorCoordenadas, type Municipio } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/municipios';
import { cruzarRegla, type ReglaAplicada, type ReglaPrecio } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/precio-dinamico';
import { obtenerReglas } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/reglas';

// ============================================================
//  Módulo 30 — Decisión de ubicación y regla (ÚNICA, compartida por /geo/ y /checkout/)
//
//  1. Coordenadas del navegador válidas → municipio por polígono DANE.   fuente "gps"
//  2. Sin coordenadas e IP de un ASN MÓVIL → sin municipio ni descuento,
//     requiere_ubicacion: true. Las IPs móviles en Colombia geolocalizan a
//     Bogotá sin importar dónde esté la persona (caso draft #D1529).      fuente "ip-movil"
//  3. Sin coordenadas e IP fija → GeoLite2-City.                         fuente "ip"
// ============================================================

export type Fuente = 'gps' | 'ip' | 'ip-movil';

export interface Coordenadas {
  lat: number;
  lng: number;
  acc: number; // precisión en metros
}

/**
 * ASN de redes MÓVILES en Colombia (verificados contra DB-IP ASN Lite / iptoasn, 2026-10).
 * Fuera a propósito: AS3816 Movistar (mezcla fijo y móvil) y AS13489 UNE/Tigo
 * (mayoría fijo; su IP fija geolocaliza bien).
 */
export const ASN_MOVILES: ReadonlyMap<number, string> = new Map([
  [26611, 'Comcel / Claro móvil'],
  [27831, 'Colombia Móvil / Tigo'],
  [271773, 'WOM (Partners Telecom Colombia)'],
]);

// Caja aproximada de Colombia, incluido San Andrés y Providencia.
const COLOMBIA = { latMin: -4.3, latMax: 13.6, lngMin: -82.0, lngMax: -66.8 };
export const PRECISION_MAXIMA_M = 5000;

/** Coordenadas válidas (numéricas, dentro de Colombia, acc <= 5000 m) o null para ignorarlas. */
export function validarCoordenadas(raw: unknown): Coordenadas | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown) => (v == null || v === '' ? NaN : Number(v));
  const lat = num(o.lat);
  const lng = num(o.lng);
  const acc = num(o.acc);
  if (![lat, lng, acc].every(Number.isFinite)) return null;
  if (lat < COLOMBIA.latMin || lat > COLOMBIA.latMax || lng < COLOMBIA.lngMin || lng > COLOMBIA.lngMax) return null;
  if (acc < 0 || acc > PRECISION_MAXIMA_M) return null;
  return { lat, lng, acc };
}

export interface ResultadoUbicacion {
  fuente: Fuente;
  ciudad: string | null;
  ciudadOficial: string | null; // nombre DANE (solo gps)
  region: string | null;
  pais: string | null;
  latitud: number | null;
  longitud: number | null;
  precision_m: number | null;
  ip: string | null;
  asn: number | null;
  regla: ReglaAplicada | null;
  requiere_ubicacion: boolean;
}

export interface Dependencias {
  reglas: () => Promise<ReglaPrecio[]>;
  ubicarIp: (ip: string | null) => Promise<Ubicacion>;
  asnDeIp: (ip: string | null) => Promise<number | null>;
  municipioPorCoordenadas: (lat: number, lng: number) => Municipio | null;
}

/** Una regla del 0 % equivale a no tener regla (precio de lista, sin borrador). */
function conDescuento(regla: ReglaAplicada | null): ReglaAplicada | null {
  return regla && regla.descuento !== 0 ? regla : null;
}

const DEPENDENCIAS_REALES: Dependencias = {
  reglas: obtenerReglas,
  ubicarIp,
  asnDeIp,
  municipioPorCoordenadas,
};

/**
 * Decide ubicación y regla. `coordenadas` puede venir sin validar: si no son
 * válidas se ignoran y se decide por IP.
 */
export async function resolverUbicacion(
  entrada: { coordenadas?: unknown; ip: string | null },
  deps: Dependencias = DEPENDENCIAS_REALES
): Promise<ResultadoUbicacion> {
  const { ip } = entrada;
  const coords = validarCoordenadas(entrada.coordenadas);

  // 1) GPS
  if (coords) {
    const m = deps.municipioPorCoordenadas(coords.lat, coords.lng);
    const reglas = await deps.reglas();
    return {
      fuente: 'gps',
      ciudad: m?.municipio ?? null,
      ciudadOficial: m?.municipioOficial ?? null,
      region: m?.departamento ?? null,
      pais: 'CO',
      latitud: coords.lat,
      longitud: coords.lng,
      precision_m: coords.acc,
      ip,
      asn: null,
      regla: m ? conDescuento(cruzarRegla(reglas, [m.municipio, m.municipioOficial], m.departamento)) : null,
      requiere_ubicacion: false,
    };
  }

  // 2) IP móvil: la IP no dice dónde está la persona
  const asn = await deps.asnDeIp(ip);
  if (asn != null && ASN_MOVILES.has(asn)) {
    return {
      fuente: 'ip-movil',
      ciudad: null,
      ciudadOficial: null,
      region: null,
      pais: 'CO',
      latitud: null,
      longitud: null,
      precision_m: null,
      ip,
      asn,
      regla: null,
      requiere_ubicacion: true,
    };
  }

  // 3) IP fija
  const u = await deps.ubicarIp(ip);
  const reglas = await deps.reglas();
  return {
    fuente: 'ip',
    ciudad: u.ciudad,
    ciudadOficial: null,
    region: u.region,
    pais: u.pais,
    latitud: u.latitud,
    longitud: u.longitud,
    precision_m: null,
    ip,
    asn,
    regla: conDescuento(cruzarRegla(reglas, [u.ciudad], u.region)),
    requiere_ubicacion: false,
  };
}

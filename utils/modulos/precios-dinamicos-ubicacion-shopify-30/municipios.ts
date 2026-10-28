import fs from 'node:fs';
import path from 'node:path';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { MultiPolygon, Polygon } from 'geojson';

// ============================================================
//  Módulo 30 — Coordenadas → municipio (reverse geocoding OFFLINE)
//
//  Polígonos oficiales de municipios del DANE (Marco Geoestadístico Nacional
//  2018, simplificados; 1.122 municipios) en `municipios-dane-mgn2018.geojson`.
//  Se cargan UNA vez por proceso. Sin APIs externas.
// ============================================================

const GEOJSON_PATH = path.join(
  process.cwd(),
  'utils',
  'modulos',
  'precios-dinamicos-ubicacion-shopify-30',
  'municipios-dane-mgn2018.geojson'
);

export interface Municipio {
  codigo: string; // código DANE (DIVIPOLA), p. ej. 54001
  municipio: string; // nombre común: "Cúcuta"
  municipioOficial: string; // nombre DANE: "San José de Cúcuta"
  departamento: string; // "Norte de Santander"
}

interface Entrada extends Municipio {
  geometria: Polygon | MultiPolygon;
  bbox: [number, number, number, number]; // minLng, minLat, maxLng, maxLat
}

// Nombres oficiales DANE → nombre de uso común (el que usan las reglas del tema y GeoLite).
const ALIAS_MUNICIPIO: Record<string, string> = {
  'BOGOTÁ, D.C.': 'Bogotá',
  'SAN JOSÉ DE CÚCUTA': 'Cúcuta',
  'CARTAGENA DE INDIAS': 'Cartagena',
  'GUADALAJARA DE BUGA': 'Buga',
  'SAN ANDRÉS DE TUMACO': 'Tumaco',
  'SAN SEBASTIÁN DE MARIQUITA': 'Mariquita',
  'VILLA DE SAN DIEGO DE UBATÉ': 'Ubaté',
  'SANTIAGO DE TOLÚ': 'Tolú',
};

const ALIAS_DEPARTAMENTO: Record<string, string> = {
  'BOGOTÁ, D.C.': 'Bogotá D.C.',
  'ARCHIPIÉLAGO DE SAN ANDRÉS, PROVIDENCIA Y SANTA CATALINA': 'San Andrés y Providencia',
  QUINDIO: 'Quindío',
};

const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e']);

/** "SAN JOSÉ DEL GUAVIARE" → "San José del Guaviare" */
export function titulo(oficial: string): string {
  return oficial
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
}

function bboxDe(geometria: Polygon | MultiPolygon): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const anillos = geometria.type === 'Polygon' ? geometria.coordinates : geometria.coordinates.flat();
  for (const anillo of anillos) {
    for (const [x, y] of anillo) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return [minX, minY, maxX, maxY];
}

let cache: Entrada[] | null = null;

function cargar(): Entrada[] {
  if (cache) return cache;
  const geo = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
  cache = (geo.features as any[]).map((f) => {
    const oficial = String(f.properties.municipio);
    const depto = String(f.properties.departamento);
    return {
      codigo: String(f.properties.codigo),
      municipio: ALIAS_MUNICIPIO[oficial] ?? titulo(oficial),
      municipioOficial: titulo(oficial),
      departamento: ALIAS_DEPARTAMENTO[depto] ?? titulo(depto),
      geometria: f.geometry,
      bbox: bboxDe(f.geometry),
    };
  });
  return cache;
}

/** Municipio que contiene el punto, o null si cae fuera de todos (mar, frontera). */
export function municipioPorCoordenadas(lat: number, lng: number): Municipio | null {
  for (const m of cargar()) {
    const [minX, minY, maxX, maxY] = m.bbox;
    if (lng < minX || lng > maxX || lat < minY || lat > maxY) continue;
    if (booleanPointInPolygon([lng, lat], m.geometria)) {
      return { codigo: m.codigo, municipio: m.municipio, municipioOficial: m.municipioOficial, departamento: m.departamento };
    }
  }
  return null;
}

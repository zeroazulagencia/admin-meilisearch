import { test } from 'node:test';
import assert from 'node:assert/strict';
import { municipioPorCoordenadas } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/municipios';
import { etiquetaRegla, type ReglaPrecio } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/precio-dinamico';
import {
  resolverUbicacion,
  validarCoordenadas,
  type Dependencias,
} from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/ubicacion';
import type { Ubicacion } from '@/utils/modulos/precios-dinamicos-ubicacion-shopify-30/geo-ip';

// ---------- point-in-polygon (polígonos DANE reales) ----------

test('point-in-polygon: Cúcuta', () => {
  const m = municipioPorCoordenadas(7.8939, -72.5078);
  assert.equal(m?.municipio, 'Cúcuta');
  assert.equal(m?.municipioOficial, 'San José de Cúcuta');
  assert.equal(m?.departamento, 'Norte de Santander');
  assert.equal(m?.codigo, '54001');
});

test('point-in-polygon: Bogotá', () => {
  const m = municipioPorCoordenadas(4.6097, -74.0817);
  assert.equal(m?.municipio, 'Bogotá');
  assert.equal(m?.departamento, 'Bogotá D.C.');
});

test('point-in-polygon: Bucaramanga', () => {
  const m = municipioPorCoordenadas(7.1193, -73.1227);
  assert.equal(m?.municipio, 'Bucaramanga');
  assert.equal(m?.departamento, 'Santander');
});

test('point-in-polygon: Medellín', () => {
  const m = municipioPorCoordenadas(6.2442, -75.5812);
  assert.equal(m?.municipio, 'Medellín');
  assert.equal(m?.departamento, 'Antioquia');
});

test('point-in-polygon: en el mar no hay municipio', () => {
  assert.equal(municipioPorCoordenadas(12.0, -76.0), null);
});

// ---------- validación de coordenadas ----------

test('validarCoordenadas acepta Colombia con acc <= 5000', () => {
  assert.deepEqual(validarCoordenadas({ lat: '7.8939', lng: '-72.5078', acc: '30' }), { lat: 7.8939, lng: -72.5078, acc: 30 });
  assert.deepEqual(validarCoordenadas({ lat: 4.6, lng: -74.08, acc: 5000 }), { lat: 4.6, lng: -74.08, acc: 5000 });
});

test('validarCoordenadas ignora coords fuera de Colombia, acc > 5000 o datos incompletos', () => {
  assert.equal(validarCoordenadas({ lat: 40.4168, lng: -3.7038, acc: 30 }), null); // Madrid
  assert.equal(validarCoordenadas({ lat: 4.6, lng: -74.08, acc: 5001 }), null);
  assert.equal(validarCoordenadas({ lat: 4.6, lng: -74.08 }), null);
  assert.equal(validarCoordenadas({ lat: 'x', lng: -74.08, acc: 10 }), null);
  assert.equal(validarCoordenadas({ lat: 4.6, lng: -74.08, acc: -1 }), null);
  assert.equal(validarCoordenadas(null), null);
});

// ---------- función de decisión ----------

const REGLAS: ReglaPrecio[] = [
  { nombre: 'Bogotá', descuento: 10 },
  { nombre: 'Envigado', descuento: -10 },
  { nombre: 'Antioquia', descuento: 5 },
  { nombre: 'Cúcuta', descuento: 0 },
];

const UBICACION_BOGOTA: Ubicacion = { ciudad: 'Bogotá', region: 'Bogota D.C.', pais: 'CO', latitud: 4.6, longitud: -74.08 };

function deps(over: Partial<Dependencias> = {}): Dependencias & { llamadasIp: number } {
  const d = {
    llamadasIp: 0,
    reglas: async () => REGLAS,
    ubicarIp: async () => {
      d.llamadasIp++;
      return UBICACION_BOGOTA;
    },
    asnDeIp: async () => 13489, // UNE/EPM, red fija
    municipioPorCoordenadas,
    ...over,
  };
  return d;
}

test('decisión: GPS en Cúcuta (regla del 0 %) → fuente gps, sin regla, no consulta la IP', async () => {
  const d = deps();
  const r = await resolverUbicacion({ coordenadas: { lat: 7.8939, lng: -72.5078, acc: 30 }, ip: '191.156.187.6' }, d);
  assert.equal(r.fuente, 'gps');
  assert.equal(r.ciudad, 'Cúcuta');
  assert.equal(r.regla, null);
  assert.equal(r.requiere_ubicacion, false);
  assert.equal(r.precision_m, 30);
  assert.equal(d.llamadasIp, 0);
});

test('decisión: GPS en Bogotá → regla Bogotá 10 %', async () => {
  const r = await resolverUbicacion({ coordenadas: { lat: 4.6097, lng: -74.0817, acc: 30 }, ip: null }, deps());
  assert.equal(r.fuente, 'gps');
  assert.equal(r.ciudad, 'Bogotá');
  assert.deepEqual(r.regla, { nombre: 'Bogotá', descuento: 10, tipo: 'municipio' });
  assert.equal(etiquetaRegla(r.regla!), 'pd-municipio-bogota');
});

test('decisión: GPS en Medellín sin regla de municipio → cae a la del departamento', async () => {
  const r = await resolverUbicacion({ coordenadas: { lat: 6.2442, lng: -75.5812, acc: 50 }, ip: null }, deps());
  assert.deepEqual(r.regla, { nombre: 'Antioquia', descuento: 5, tipo: 'departamento' });
  assert.equal(etiquetaRegla(r.regla!), 'pd-departamento-antioquia');
});

test('decisión: sin coords e IP móvil (Comcel AS26611) → ip-movil, sin regla, requiere_ubicacion', async () => {
  const d = deps({ asnDeIp: async () => 26611 });
  const r = await resolverUbicacion({ ip: '191.156.187.6' }, d);
  assert.equal(r.fuente, 'ip-movil');
  assert.equal(r.ciudad, null);
  assert.equal(r.regla, null);
  assert.equal(r.requiere_ubicacion, true);
  assert.equal(d.llamadasIp, 0); // no se usa la ciudad de la IP móvil
});

test('decisión: WOM (AS271773) también es móvil', async () => {
  const r = await resolverUbicacion({ ip: '1.2.3.4' }, deps({ asnDeIp: async () => 271773 }));
  assert.equal(r.fuente, 'ip-movil');
});

test('decisión: sin coords e IP fija → fuente ip con la regla de su ciudad', async () => {
  const r = await resolverUbicacion({ ip: '181.142.85.32' }, deps());
  assert.equal(r.fuente, 'ip');
  assert.equal(r.ciudad, 'Bogotá');
  assert.equal(r.regla?.descuento, 10);
  assert.equal(r.requiere_ubicacion, false);
});

test('decisión: coords fuera de Colombia o acc > 5000 se ignoran (paso 2 o 3)', async () => {
  const movil = deps({ asnDeIp: async () => 26611 });
  assert.equal((await resolverUbicacion({ coordenadas: { lat: 40.4, lng: -3.7, acc: 30 }, ip: 'x' }, movil)).fuente, 'ip-movil');
  assert.equal((await resolverUbicacion({ coordenadas: { lat: 7.89, lng: -72.5, acc: 9000 }, ip: 'x' }, deps())).fuente, 'ip');
});

test('decisión: ASN desconocido (sin base o IP nula) → se decide por IP', async () => {
  const r = await resolverUbicacion({ ip: null }, deps({ asnDeIp: async () => null }));
  assert.equal(r.fuente, 'ip');
});

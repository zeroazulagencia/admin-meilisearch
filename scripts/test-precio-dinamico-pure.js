#!/usr/bin/env node
/**
 * Banco de pruebas de la lógica PURA de precios dinámicos (módulo 30).
 *
 * Cubre lo que NO se puede provocar contra producción:
 *   - reglas SIMULADAS (p. ej. Envigado -10) sin tocar el metaobjeto del tema
 *   - normalización / cruce / redondeo / validación de entrada
 *
 * Usa datos REALES donde se puede: descarga el HTML real del tema
 * (?section_id=precio-dinamico-reglas) para probar parseReglas contra el
 * formato de verdad. El precio real de la variante se obtiene del propio
 * endpoint (/checkout/ dry_run) o se pasa por argumento.
 *
 * Uso:  node scripts/test-precio-dinamico-pure.js [precio_base]
 */
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const RAIZ = path.resolve(__dirname, '..');
const OUT = path.join(RAIZ, '.tmp-test-compile');
const SRC = path.join('utils', 'modulos', 'precios-dinamicos-ubicacion-shopify-30');

// 1) compilar los módulos puros a JS (CommonJS) para poder testearlos
fs.rmSync(OUT, { recursive: true, force: true });
execSync(
  `npx tsc ${SRC}/precio-dinamico.ts --outDir ${OUT} --module commonjs --target es2020 --esModuleInterop --skipLibCheck`,
  { cwd: RAIZ, stdio: 'inherit' }
);

const P = require(path.join(OUT, 'precio-dinamico.js'));

let fallos = 0;
const ok = (cond, etiqueta, detalle) => {
  console.log(`${cond ? '  OK  ' : ' FALLA'} | ${etiqueta}${detalle ? ' -> ' + detalle : ''}`);
  if (!cond) fallos++;
};

(async () => {
  console.log('\n=== 1. parseReglas contra el HTML REAL del tema ===');
  const html = await fetch(
    `https://retendelcasco.com/?section_id=precio-dinamico-reglas&t=${Date.now()}`,
    { headers: { 'Cache-Control': 'no-cache' } }
  ).then((r) => r.text());

  const reglasReales = P.parseReglas(html);
  console.log('  reglas leídas:', JSON.stringify(reglasReales));
  ok(reglasReales.length > 0, 'el tema entrega al menos 1 regla');
  ok(reglasReales.some((r) => P.normalizar(r.nombre) === 'antioquia'), 'contiene Antioquia');

  console.log('\n=== 2. parseReglas tolerante (formatos alternos) ===');
  ok(P.parseReglas('<script id="precio-dinamico-reglas" type="application/json">{"municipio":"Envigado","descuento":-10}</script>')[0].descuento === -10,
     'objeto suelto + descuento negativo');
  ok(P.parseReglas('<script id="precio-dinamico-reglas">[{"departamento":"Cundinamarca","descuento":"5"}]</script>')[0].descuento === 5,
     'clave departamento + string numérico');
  ok(P.parseReglas('<script type="application/json" id="precio-dinamico-reglas">[{"municipio":"X","descuento":200}]</script>').length === 0,
     'descarta |descuento| > 100');
  ok(P.parseReglas('<div>sin script</div>').length === 0, 'sin script -> []');

  console.log('\n=== 3. normalización (NFD, tildes, mayúsculas, espacios) ===');
  ok(P.normalizar('  MEDELLÍN ') === 'medellin', 'MEDELLÍN -> medellin', P.normalizar('  MEDELLÍN '));
  ok(P.normalizar('Bogotá  D.C.') === 'bogota d.c.', 'Bogotá  D.C.', P.normalizar('Bogotá  D.C.'));
  ok(P.normalizar(null) === '', 'null -> ""');

  console.log('\n=== 4. cruce: municipio primero, luego departamento ===');
  const simuladas = [{ nombre: 'Envigado', descuento: -10 }, { nombre: 'Antioquia', descuento: 10 }];
  const r1 = P.cruzarRegla(simuladas, 'Envigado', 'Antioquia');
  ok(r1 && r1.nombre === 'Envigado', 'ciudad gana sobre departamento cuando ambas coinciden', JSON.stringify(r1));
  const r2 = P.cruzarRegla(simuladas, 'MEDELLÍN', 'Antioquia');
  ok(r2 && r2.nombre === 'Antioquia', 'sin regla de ciudad -> cae a departamento (Medellín/Antioquia)', JSON.stringify(r2));
  ok(P.cruzarRegla(simuladas, 'Bogotá', 'Bogotá D.C.') === null, 'sin coincidencia -> null');
  ok(P.cruzarRegla(reglasReales, 'Medellín', 'Antioquia')?.nombre === 'Antioquia',
     'reglas REALES del tema: Medellín/Antioquia -> Antioquia');

  console.log('\n=== 5. precio unitario (COP, sin decimales) ===');
  const base = Number(process.argv[2] || 95000);
  console.log(`  precio base tomado de Shopify: ${base}`);
  ok(P.precioUnitario(base, -10) === 104500, 'Envigado -10 sobre 95.000 -> 104.500', String(P.precioUnitario(base, -10)));
  ok(P.precioUnitario(base, 10) === 85500, 'Antioquia +10 sobre 95.000 -> 85.500', String(P.precioUnitario(base, 10)));
  ok(P.precioUnitario(base, 0) === 95000, 'descuento 0 -> precio intacto');
  ok(Number.isInteger(P.precioUnitario(33333, 7)), 'siempre entero (Math.round)');
  ok(P.precioUnitario(0, -10) === 0, 'nunca negativo');

  console.log('\n=== 6. validación de entrada (lo único que acepta el navegador) ===');
  ok(P.validarEntrada({ items: [{ variant_id: 123, quantity: 2 }] }).ok, 'entrada válida');
  ok(!P.validarEntrada({ items: [] }).ok, 'items vacío -> 400');
  ok(!P.validarEntrada({ items: new Array(51).fill({ variant_id: 1, quantity: 1 }) }).ok, '51 líneas -> 400');
  ok(!P.validarEntrada({ items: [{ variant_id: 'abc', quantity: 1 }] }).ok, 'variant_id no numérico -> 400');
  ok(!P.validarEntrada({ items: [{ variant_id: 1, quantity: 0 }] }).ok, 'quantity 0 -> 400');
  ok(!P.validarEntrada({ items: [{ variant_id: 1, quantity: 21 }] }).ok, 'quantity 21 -> 400');
  ok(!P.validarEntrada({ items: [{ variant_id: 1, quantity: 1.5 }] }).ok, 'quantity decimal -> 400');
  const dup = P.validarEntrada({ items: [{ variant_id: 7, quantity: 15 }, { variant_id: 7, quantity: 15 }] });
  ok(!dup.ok, 'duplicados que suman >20 -> 400 (no se puede partir el límite por líneas)');

  console.log('\n=== 7. el precio del cliente se ignora ===');
  const conPrecioFalso = P.validarEntrada({ items: [{ variant_id: 1, quantity: 1, price: 1, precio: 1, descuento: 99 }] });
  ok(conPrecioFalso.ok && conPrecioFalso.items.length === 1 && conPrecioFalso.items[0].quantity === 1,
     'campos price/precio/descuento del cliente se descartan');

  console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLOS'}\n`);
  process.exit(fallos === 0 ? 0 : 1);
})();
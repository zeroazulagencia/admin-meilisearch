import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  codigoBase,
  consolidarLotes,
  construirCallback,
  construirPlan,
  evaluarCaida,
  filasPrecios,
  horaColombia,
  normalizarErp,
  parseExcluidos,
  slugify,
  texto,
  validarCatalogo,
  type ErpRegistro,
  type WooProducto,
} from '@/utils/modulos/sincronizador-repuestos-repuestera-31/plan';

const precios = (p1: number) => ({
  precio_1: p1, precio_2: 0, precio_3: 0, precio_4: 0, precio_5: 0,
  precio_6: null, precio_7: 0, precio_8: 0, precio_9: 0, precio_10: 0,
});

const erp = (codigo: string, extra: Partial<ErpRegistro> = {}): ErpRegistro => ({
  codigo,
  descripcion: `PRODUCTO ${codigo}`,
  descadicional: 'corta',
  descWeb: null,
  clase: 'FILTRACIÓN',
  grupo: 'ACDELCO',
  subgrupo: 'COLMOTORES',
  subgrupo2: 'PESADO',
  contable: 'Default',
  porcentaje_iva: 19,
  costo_unitario: 1000.5,
  stock: 5,
  infoPrecios: precios(2000),
  ...extra,
});

const metas = (p1: string, extra: Record<string, string> = {}) => {
  const base: Record<string, string> = {
    precio_1: p1, precio_2: '0', precio_3: '0', precio_4: '0', precio_5: '0',
    precio_6: '0', precio_7: '0', precio_8: '0', precio_9: '0', precio_10: '0',
    clase: 'FILTRACIÓN', grupo: 'ACDELCO', sub_grupo: 'COLMOTORES', sub_grupo_2: 'PESADO',
    contable: 'Default', porcentaje_iva: '19', ...extra,
  };
  return Object.entries(base).map(([key, value]) => ({ key, value }));
};

const woo = (id: number, sku: string, extra: Partial<WooProducto> = {}): WooProducto => ({
  id,
  sku,
  name: `PRODUCTO ${sku}`,
  stock_quantity: 5,
  manage_stock: true,
  regular_price: '1000.5',
  meta_data: metas('2000'),
  catalog_visibility: 'visible',
  images: [],
  status: 'publish',
  ...extra,
});

const CATS = [{ id: 91, name: 'Filtración', slug: 'filtracion' }];
const plan = (productos: ErpRegistro[], tienda: WooProducto[], excluidos = '', extra = {}) =>
  construirPlan({
    productos: normalizarErp([{ datos: productos }]).productos,
    woo: tienda,
    categorias: CATS,
    excluidos: parseExcluidos(excluidos),
    ...extra,
  });

test('normaliza sku y textos como el workflow original', () => {
  const r = normalizarErp([{ datos: [
    erp(' "AB\\C"\t ', { descripcion: 'LINEA1\nLINEA2  =  "X"', descWeb: '' }),
    erp('abc'),
    erp(''),
  ] }]);
  assert.equal(r.productos.length, 1);
  assert.equal(r.duplicados, 1);
  assert.equal(r.sinSku, 1);
  const p = r.productos[0];
  assert.equal(p.sku, 'ABC');
  assert.equal(p.nombre, "LINEA1 LINEA2 'X'");
  assert.equal(p.descLarga, 'sin descripcion');
  assert.equal(p.claseSlug, 'filtracion');
  assert.equal(p.precios.precio_6, 0);
});

test('nombre vacio usa el sku y los largos se recortan', () => {
  const p = normalizarErp([{ datos: [erp('X1', { descripcion: '   ', descadicional: 'a'.repeat(600) })] }]).productos[0];
  assert.equal(p.nombre, 'X1');
  assert.equal(p.descCorta.length, 500);
  assert.equal(texto('a'.repeat(300), 200).length, 200);
});

test('numeros invalidos valen 0 y precios/costo nunca negativos', () => {
  const p = normalizarErp([{ datos: [erp('N1', { costo_unitario: '-50', stock: 'abc', infoPrecios: precios(-3) })] }]).productos[0];
  assert.equal(p.costo, 0);
  assert.equal(p.stock, 0);
  assert.equal(p.precios.precio_1, 0);
});

test('slug y codigo base', () => {
  assert.equal(slugify('SISTEMA REFRIGERACIÓN'), 'sistema-refrigeracion');
  assert.equal(codigoBase('12345*i'), '12345');
  assert.equal(codigoBase('19279642*/'), '19279642*/');
});

test('valida que el catalogo del ERP este completo', () => {
  const pag = (n: number, datos: number) => ({
    paginaActual: n, totalPaginas: 2, totalRegistros: 3, datos: Array.from({ length: datos }, (_, i) => erp(`P${n}-${i}`)),
  });
  assert.equal(validarCatalogo([pag(1, 2), pag(2, 1)]), null);
  assert.match(String(validarCatalogo([pag(1, 2)])), /Paginacion incompleta/);
  assert.match(String(validarCatalogo([pag(1, 2), pag(2, 0)])), /Catalogo incompleto/);
  assert.match(String(validarCatalogo([{ paginaActual: 1, totalPaginas: 0, totalRegistros: 0, datos: [] }])), /0 productos/);
});

test('proteccion de caida compara contra la referencia, no contra la tienda', () => {
  assert.equal(evaluarCaida(1372, 1372, 0.7).ok, true);
  assert.equal(evaluarCaida(1000, 1372, 0.7).ok, true);
  assert.equal(evaluarCaida(900, 1372, 0.7).ok, false);
  assert.equal(evaluarCaida(0, 0, 0.7).ok, false);
  assert.equal(evaluarCaida(10, 0, 0.7).ok, true);
});

test('crea lo que no existe con metas, categoria y producto_importado', () => {
  const r = plan([erp('NUEVO')], []);
  assert.equal(r.lotes.length, 1);
  const c = r.lotes[0].create[0] as any;
  assert.equal(c.status, 'publish');
  assert.equal(c.regular_price, '1000.5');
  assert.deepEqual(c.categories, [{ id: 91 }]);
  assert.ok(c.meta_data.some((m: any) => m.key === 'producto_importado' && m.value === 'si'));
  assert.ok(c.meta_data.some((m: any) => m.key === 'precio_1' && m.value === '2000'));
  assert.equal(r.erroresPlan.length, 0);
});

test('no toca productos sin cambios y actualiza los que cambiaron', () => {
  const r = plan([erp('A'), erp('B', { stock: 3 })], [woo(1, 'A'), woo(2, 'b')]);
  assert.equal(r.stats.sin_cambios, 1);
  assert.equal(r.stats.a_actualizar, 1);
  const u = r.lotes[0].update[0] as any;
  assert.equal(u.id, 2);
  assert.equal(u.stock_quantity, 3);
  assert.equal(u.regular_price, '1000.5');
  assert.equal(u.meta_data.length, 16);
  assert.deepEqual(r.lotes[0].detalleActualizar[0].campos, [{ campo: 'Stock', anterior: 5, nuevo: 3 }]);
});

test('precios guardados con decimales en texto no cuentan como cambio', () => {
  const r = plan([erp('A', { infoPrecios: precios(22955.66) })], [woo(1, 'A', { meta_data: metas('22955.66') })]);
  assert.equal(r.stats.sin_cambios, 1);
});

test('oculto que vuelve del ERP se actualiza y se hace visible aunque no cambie', () => {
  const r = plan([erp('A')], [woo(1, 'A', { catalog_visibility: 'hidden' })]);
  const u = r.lotes[0].update[0] as any;
  assert.equal(u.catalog_visibility, 'visible');
  assert.deepEqual(r.stats.reaparecidos_visibles, ['A']);
});

test('sin categoria: crea sin categories, no pisa la actual y lo cuenta como error', () => {
  const r = plan(
    [erp('NUEVO', { clase: 'CLASE NUEVA' }), erp('A', { clase: '', stock: 1 })],
    [woo(1, 'A')]
  );
  const c = r.lotes[0].create[0] as any;
  const u = r.lotes[0].update[0] as any;
  assert.equal('categories' in c, false);
  assert.equal('categories' in u, false);
  assert.equal(r.erroresPlan.length, 2);
  assert.deepEqual(r.erroresPlan.map((e) => e.code), ['categoria_inexistente', 'clase_vacia']);
});

test('excluidos: no se crean ni actualizan; publicados pasan a borrador', () => {
  const r = plan([erp('X*I'), erp('Y*I')], [woo(9, 'Y*I', { stock_quantity: 1 })], 'X*I, Y*I');
  assert.equal(r.stats.a_crear, 0);
  assert.equal(r.stats.excluidos_ignorados_del_erp, 2);
  assert.deepEqual(r.lotes[0].update, [{ id: 9, status: 'draft' }]);
});

test('huerfanos activos se ocultan con stock 0; nunca los excluidos', () => {
  const r = plan([erp('A')], [
    woo(1, 'A'),
    woo(2, 'VIEJO', { stock_quantity: 3 }),
    woo(3, 'YAOCULTO', { stock_quantity: 0, catalog_visibility: 'hidden' }),
    woo(4, 'EXC', { status: 'draft', stock_quantity: 2 }),
  ], 'EXC');
  assert.deepEqual(r.ocultados, ['VIEJO']);
  assert.deepEqual(r.lotes[0].update, [{ id: 2, manage_stock: true, stock_quantity: 0, catalog_visibility: 'hidden' }]);
});

test('mas huerfanos que el maximo: no oculta ninguno', () => {
  const tienda = Array.from({ length: 4 }, (_, i) => woo(i + 1, `H${i}`, { stock_quantity: 1 }));
  const r = plan([], tienda, '', { maxHuerfanos: 3 });
  assert.equal(r.ocultados.length, 0);
  assert.match(String(r.stats.motivo_no_ocultar), /mas de 3/);
});

test('mismo producto con otro codigo hereda codigo_anterior y la foto', () => {
  const r = plan(
    [erp('12345*I'), erp('NUEVO2', { descripcion: 'FILTRO  aceite' })],
    [
      woo(1, '12345', { stock_quantity: 0, catalog_visibility: 'hidden', images: [{ id: 77 }] }),
      woo(2, 'OTRO', { name: 'filtro aceite', stock_quantity: 0, catalog_visibility: 'hidden', images: [{ id: 88 }] }),
    ]
  );
  const [a, b] = r.lotes[0].create as any[];
  assert.ok(a.meta_data.some((m: any) => m.key === 'codigo_anterior' && m.value === '12345'));
  assert.deepEqual(a.images, [{ id: 77 }]);
  assert.ok(b.meta_data.some((m: any) => m.key === 'codigo_anterior' && m.value === 'OTRO'));
  assert.deepEqual(b.images, [{ id: 88 }]);
});

test('lotes de 50 combinando creaciones y actualizaciones', () => {
  const nuevos = Array.from({ length: 30 }, (_, i) => erp(`N${i}`));
  const cambiados = Array.from({ length: 40 }, (_, i) => erp(`C${i}`, { stock: 9 }));
  const tienda = Array.from({ length: 40 }, (_, i) => woo(i + 1, `C${i}`));
  const r = plan([...nuevos, ...cambiados], tienda);
  assert.equal(r.lotes.length, 2);
  assert.equal(r.lotes[0].create.length + r.lotes[0].update.length, 50);
  assert.equal(r.lotes[1].create.length + r.lotes[1].update.length, 20);
});

test('consolida errores por producto y lotes caidos', () => {
  const r = plan([erp('N1'), erp('A', { stock: 1 })], [woo(5, 'A')]);
  const ok = consolidarLotes(r.lotes, [{
    ok: true,
    body: {
      create: [{ id: 0, error: { code: 'product_invalid_sku', message: 'ya esta en la tabla de busqueda' } }],
      update: [{ id: 5, sku: 'A', name: 'PRODUCTO A' }],
    },
  }]);
  assert.equal(ok.creados, 0);
  assert.equal(ok.actualizados, 1);
  assert.equal(ok.errores, 1);
  assert.equal(ok.errorSamples[0].sku, 'N1');
  assert.equal(ok.updatedProducts[0].cambios[0].campo, 'Stock');

  const caido = consolidarLotes(r.lotes, [{ ok: false, error: 'timeout' }]);
  assert.equal(caido.errores, 2);
  assert.equal(caido.errorSamples[0].tipo, 'request');
});

test('callback: duracion con el reloj del servidor y horas de Colombia', () => {
  const inicio = new Date('2026-11-03T14:23:48Z');
  const fin = new Date('2026-11-03T14:26:42Z');
  const cb = construirCallback({
    status: 'done', totalErp: 10, creados: 1, actualizados: 2, sinCambios: 7, errores: 0,
    errorSamples: [], createdProducts: [], updatedProducts: [], inicio, fin, lotes: 1, tamanoLote: 50,
  });
  assert.equal(cb.execution.duration_seconds, 174);
  assert.equal(cb.execution.started_at, '2026-11-03 09:23:48');
  assert.equal(cb.execution.finished_at, '2026-11-03 09:26:42');
  assert.equal(cb.sync.processed, 3);
  assert.equal(horaColombia(new Date('2026-01-01T03:00:00Z')), '2025-12-31 22:00:00');
});

test('callback de error lleva el motivo', () => {
  const d = new Date();
  const cb = construirCallback({
    status: 'error', mensaje: 'ERP caido', totalErp: 0, creados: 0, actualizados: 0, sinCambios: 0, errores: 1,
    errorSamples: [], createdProducts: [], updatedProducts: [], inicio: d, fin: d, lotes: 0, tamanoLote: 50,
  });
  assert.equal(cb.status, 'error');
  assert.equal((cb as any).message, 'ERP caido');
});

test('filas de precios: una por producto con sku', () => {
  const filas = filasPrecios([woo(1, '19279670', { meta_data: metas('23800') }), woo(2, '')]);
  assert.equal(filas.length, 1);
  assert.equal(filas[0].sku, '19279670');
  assert.equal(filas[0].precio_1, '23800');
  assert.equal(filas[0].precio_10, '0');
});

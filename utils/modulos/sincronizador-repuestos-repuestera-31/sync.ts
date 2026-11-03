/**
 * Una corrida completa del sincronizador (modulo 31). La ejecuta el worker
 * scripts/mod31-repuestera-worker.ts en un proceso aparte para que el webhook responda rapido.
 */
import mysql from 'mysql2/promise';
import { getRuntimeConfig, setConfig, type RuntimeConfig } from './config';
import {
  categoriasFaltantes,
  consolidarLotes,
  construirCallback,
  construirPlan,
  evaluarCaida,
  normalizarErp,
  parseExcluidos,
  validarCatalogo,
  type ErrorMuestra,
  type Lote,
  type RespuestaLote,
  type WooCategoria,
} from './plan';
import {
  conReintentos,
  erpCatalogo,
  erpToken,
  errorTexto,
  wooBatch,
  wooCategorias,
  wooCrearCategorias,
  wooProductos,
  wpCallback,
  type Reintento,
} from './clientes';
import {
  LOCK_NAME,
  actualizarRun,
  insertarLogs,
  obtenerRun,
  purgarAntiguos,
  type LogEntrada,
} from './runs';

const INTENTOS = 3;
const ESPERA_MS = 5000;

/** Error que no se debe reintentar a nivel de corrida (ej. caida del ERP reportada por el propio ERP). */
class ErrorDefinitivo extends Error {}

export async function ejecutarCorrida(runId: number): Promise<void> {
  const run = await obtenerRun(runId);
  if (!run) throw new Error(`No existe la corrida ${runId}`);

  // Conexion propia para el lock: si el proceso muere, MySQL lo libera solo.
  const lockConn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'admin_dworkers',
  });

  try {
    const [rows] = await lockConn.query('SELECT GET_LOCK(?, 0) AS ok', [LOCK_NAME]);
    if ((rows as any)[0]?.ok !== 1) {
      await actualizarRun(runId, {
        status: 'skipped', paso: 'Omitida', motivo_error: 'Ya hay otra corrida en curso',
        finished_at: new Date() as any, duracion_segundos: 0,
      });
      return;
    }
    await correr(runId, run.simulacion === 1, run.forzado === 1);
  } finally {
    await lockConn.end().catch(() => undefined);
  }
}

async function correr(runId: number, simulacion: boolean, forzado: boolean): Promise<void> {
  const inicio = new Date();
  const logs: LogEntrada[] = [];
  const paso = (texto: string) => actualizarRun(runId, { paso: texto });
  const evento = (accion: string, resultado: string, detalle: string, sku: string | null = null) =>
    logs.push({ sku, accion, resultado, detalle: detalle.substring(0, 2000) });
  const reintento = (timeoutMs: number, que: string): Reintento => ({
    intentos: INTENTOS,
    esperaMs: ESPERA_MS,
    timeoutMs,
    onFallo: (i, err) => evento('reintento', 'error', `${que}, intento ${i} de ${INTENTOS}: ${err}`),
  });

  let cfg: RuntimeConfig | null = null;
  let totalErp = 0;
  let lotes: Lote[] = [];

  await actualizarRun(runId, { status: 'running', paso: 'Iniciando', pid: process.pid, started_at: inicio as any });

  try {
    cfg = await getRuntimeConfig();
    const faltan = [
      ['erp_base_url', cfg.erpBaseUrl], ['erp_usuario', cfg.erpUsuario], ['erp_clave', cfg.erpClave],
      ['woo_base_url', cfg.wooBaseUrl], ['woo_consumer_key', cfg.wooKey], ['woo_consumer_secret', cfg.wooSecret],
    ].filter(([, v]) => !v).map(([k]) => k);
    if (faltan.length) throw new ErrorDefinitivo(`Falta configurar: ${faltan.join(', ')}`);

    const erp = { baseUrl: cfg.erpBaseUrl, usuario: cfg.erpUsuario, clave: cfg.erpClave };
    const woo = { baseUrl: cfg.wooBaseUrl, key: cfg.wooKey, secret: cfg.wooSecret };

    // 1. ERP: el catalogo completo o nada. Si llega incompleto es un error de lectura y se reintenta.
    await paso('Leyendo el ERP');
    const paginas = await conReintentos(async () => {
      const token = await erpToken(erp, reintento(30000, 'Token del ERP'));
      const pags = await erpCatalogo(erp, token, reintento(120000, 'Pagina del ERP'));
      const invalido = validarCatalogo(pags);
      if (invalido) throw new Error(invalido);
      return pags;
    }, reintento(0, 'Lectura completa del ERP'));
    const normal = normalizarErp(paginas);
    totalErp = normal.productos.length;
    evento('erp', 'ok', `${totalErp} productos en ${normal.paginas} paginas (duplicados ${normal.duplicados}, sin codigo ${normal.sinSku})`);

    // 2. WooCommerce
    await paso('Leyendo WooCommerce');
    const productosWoo = await wooProductos(woo, reintento(120000, 'Productos de WooCommerce'));
    let categorias: WooCategoria[] = await wooCategorias(woo, reintento(60000, 'Categorias de WooCommerce'));
    evento('woo', 'ok', `${productosWoo.length} productos y ${categorias.length} categorias`);

    // 3. Proteccion contra caidas del ERP (no cuenta los ocultos)
    const visibles = productosWoo.filter((w) => w.catalog_visibility !== 'hidden').length;
    const base = cfg.ultimoTotalErp || visibles;
    const caida = evaluarCaida(totalErp, base, cfg.minRatioErp);
    if (!caida.ok && !forzado) throw new ErrorDefinitivo(caida.motivo || 'Caida del ERP');
    if (!caida.ok && forzado) evento('caida_erp', 'forzado', `${caida.motivo} Se continua porque la corrida fue aprobada a mano.`);

    // 4. Categorias faltantes
    const faltantes = categoriasFaltantes(normal.productos, categorias, cfg.maxCategoriasNuevas);
    if (faltantes.length) {
      if (simulacion) {
        faltantes.forEach((f, i) => {
          categorias = [...categorias, { id: -(i + 1), name: f.name, slug: f.slug }];
          evento('categoria', 'simulado', `Se crearia la categoria ${f.name} (${f.slug})`);
        });
      } else {
        await paso(`Creando ${faltantes.length} categorias`);
        try {
          const resp = await wooCrearCategorias(woo, faltantes, reintento(120000, 'Crear categorias'));
          for (const c of resp.create || []) {
            if (c?.error || !c?.id) evento('categoria', 'error', `No se pudo crear: ${c?.error?.message || 'sin id'}`);
            else {
              categorias = [...categorias, c];
              evento('categoria', 'ok', `Creada ${c.name} (${c.slug}) id ${c.id}`);
            }
          }
        } catch (e) {
          evento('categoria', 'error', `Fallo la creacion de categorias: ${errorTexto(e)}`);
        }
      }
    }

    // 5. Plan
    await paso('Calculando cambios');
    const plan = construirPlan({
      productos: normal.productos,
      woo: productosWoo,
      categorias,
      excluidos: parseExcluidos(cfg.skusExcluidos),
      tamanoLote: cfg.tamanoLote,
      maxHuerfanos: cfg.maxHuerfanos,
    });
    lotes = plan.lotes;
    if (plan.stats.motivo_no_ocultar) evento('huerfanos', 'omitido', `No se ocultan huerfanos: ${plan.stats.motivo_no_ocultar}`);
    for (const e of plan.erroresPlan) evento('categoria', 'error', e.mensaje, e.sku);

    // El total de esta lectura pasa a ser la referencia de la proteccion de caidas
    await setConfig('ultimo_total_erp', String(totalErp));

    // 6. Escritura
    let respuestas: RespuestaLote[];
    if (simulacion) {
      respuestas = lotes.map((l) => ({
        ok: true,
        body: {
          create: l.detalleCrear.map((d) => ({ sku: d.sku, name: d.nombre })),
          update: l.detalleActualizar.map((d) => ({ sku: d.sku, name: d.nombre })),
        },
      }));
    } else {
      respuestas = [];
      for (let i = 0; i < lotes.length; i++) {
        await paso(`Enviando lote ${i + 1} de ${lotes.length}`);
        try {
          const body = await wooBatch(woo, lotes[i].create, lotes[i].update, reintento(300000, `Lote ${i + 1}`));
          respuestas.push({ ok: true, body });
        } catch (e) {
          // Igual que el flujo original: se sigue con el siguiente lote
          respuestas.push({ ok: false, error: errorTexto(e) });
        }
      }
    }

    const r = consolidarLotes(lotes, respuestas, plan.erroresPlan);
    const res = simulacion ? 'simulado' : 'ok';
    lotes.forEach((l) => {
      l.detalleCrear.forEach((d) => evento('crear', res, d.nombre, d.sku));
      l.detalleActualizar.forEach((d) => evento('actualizar', res, d.campos.map((c) => `${c.campo}: ${c.anterior} -> ${c.nuevo}`).join(' | '), d.sku));
    });
    if (!simulacion) {
      for (const f of r.fallidos) {
        const log = logs.find((x) => x.sku === f.sku && (x.accion === 'crear' || x.accion === 'actualizar') && x.resultado === 'ok');
        if (log) { log.resultado = 'error'; log.detalle = `${f.mensaje} | ${log.detalle}`; }
        else evento(f.tipo, 'error', f.mensaje, f.sku);
      }
    }

    const status = r.errores > 0 ? 'done_with_errors' : 'done';
    const fin = new Date();
    const stats = { ...plan.stats, categorias_creadas: faltantes.length, error_samples: r.errorSamples };
    const callbackStatus = simulacion
      ? 'no enviado (simulacion)'
      : await enviarCallback(cfg, construirCallback({
        status, totalErp, creados: r.creados, actualizados: r.actualizados, sinCambios: plan.stats.sin_cambios,
        errores: r.errores, errorSamples: r.errorSamples, createdProducts: r.createdProducts,
        updatedProducts: r.updatedProducts, inicio, fin, lotes: lotes.length, tamanoLote: plan.stats.tamano_lote,
      }), evento);

    await insertarLogs(runId, logs);
    await actualizarRun(runId, {
      status, paso: 'Terminada', total_erp: totalErp, creados: r.creados, actualizados: r.actualizados,
      sin_cambios: plan.stats.sin_cambios, errores: r.errores, stats: JSON.stringify(stats),
      callback_status: callbackStatus, finished_at: fin as any,
      duracion_segundos: Math.round((fin.getTime() - inicio.getTime()) / 1000),
    });
    if (!simulacion) await setConfig('ultima_sincronizacion', fin.toISOString());
  } catch (e) {
    const motivo = errorTexto(e);
    const fin = new Date();
    evento('corrida', 'error', motivo);
    let callbackStatus = 'no enviado (simulacion)';
    if (!simulacion && cfg?.wpCallbackUrl) {
      callbackStatus = await enviarCallback(cfg, construirCallback({
        status: 'error', mensaje: motivo, totalErp, creados: 0, actualizados: 0, sinCambios: 0, errores: 1,
        errorSamples: [{ tipo: 'corrida', sku: null, code: e instanceof ErrorDefinitivo ? 'cancelada' : 'fallo', mensaje: motivo } as ErrorMuestra],
        createdProducts: [], updatedProducts: [], inicio, fin, lotes: lotes.length, tamanoLote: cfg.tamanoLote,
      }), evento);
    }
    await insertarLogs(runId, logs).catch(() => undefined);
    await actualizarRun(runId, {
      status: 'error', paso: 'Error', motivo_error: motivo, total_erp: totalErp || null, errores: 1,
      callback_status: callbackStatus, finished_at: fin as any,
      duracion_segundos: Math.round((fin.getTime() - inicio.getTime()) / 1000),
    });
  } finally {
    await purgarAntiguos().catch(() => undefined);
  }
}

async function enviarCallback(
  cfg: RuntimeConfig,
  payload: unknown,
  evento: (accion: string, resultado: string, detalle: string) => void
): Promise<string> {
  if (!cfg.wpCallbackUrl || !cfg.syncToken) {
    evento('callback', 'omitido', 'Falta wp_callback_url o sync_token');
    return 'no enviado (falta configuracion)';
  }
  try {
    const status = await wpCallback(cfg.wpCallbackUrl, cfg.syncToken, payload, {
      intentos: INTENTOS, esperaMs: 3000, timeoutMs: 60000,
      onFallo: (i, err) => evento('callback', 'error', `Intento ${i} de ${INTENTOS}: ${err}`),
    });
    evento('callback', 'ok', `WordPress respondio ${status}`);
    return `ok (${status})`;
  } catch (e) {
    return `error: ${errorTexto(e)}`.substring(0, 40);
  }
}

'use client';

import { useCallback, useEffect, useState } from 'react';

type TabId = 'inicio' | 'config' | 'logs' | 'documentacion';

interface ModuleData {
  id: number;
  title: string;
  folder_name: string;
  description?: string | null;
  agent_name?: string;
  agent_id?: number;
}

interface Run {
  id: number;
  origen: string;
  simulacion: number;
  forzado: number;
  status: string;
  paso: string | null;
  motivo_error: string | null;
  total_erp: number | null;
  creados: number;
  actualizados: number;
  sin_cambios: number;
  errores: number;
  callback_status: string | null;
  started_at: string;
  finished_at: string | null;
  duracion_segundos: number | null;
  stats?: string | null;
}

interface LogRow {
  id: number;
  sku: string | null;
  accion: string;
  resultado: string;
  detalle: string | null;
  created_at: string;
}

const BASE = '/api/custom-module31/sincronizador-repuestos-repuestera';

const tabs: { id: TabId; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'config', label: 'Configuración' },
  { id: 'logs', label: 'Logs' },
  { id: 'documentacion', label: 'Documentación' },
];

const CAMPOS: { key: string; label: string; tipo?: 'password' | 'textarea' | 'modo'; ayuda?: string }[] = [
  { key: 'modo_simulacion', label: 'Modo', tipo: 'modo', ayuda: 'En simulación calcula los cambios sin escribir en la tienda ni avisar a WordPress.' },
  { key: 'erp_base_url', label: 'ERP URL base' },
  { key: 'erp_usuario', label: 'ERP usuario' },
  { key: 'erp_clave', label: 'ERP clave', tipo: 'password' },
  { key: 'woo_base_url', label: 'WooCommerce URL REST' },
  { key: 'woo_consumer_key', label: 'WooCommerce consumer key', tipo: 'password' },
  { key: 'woo_consumer_secret', label: 'WooCommerce consumer secret', tipo: 'password' },
  { key: 'wp_callback_url', label: 'URL de aviso a WordPress' },
  { key: 'sync_token', label: 'Token del plugin (X-Sync-Token)', tipo: 'password' },
  { key: 'cron_secret', label: 'Secreto del cron', tipo: 'password' },
  { key: 'tamano_lote', label: 'Productos por lote', ayuda: 'WooCommerce acepta máximo 100.' },
  { key: 'max_categorias_nuevas', label: 'Máximo de categorías nuevas por corrida' },
  { key: 'min_ratio_erp', label: 'Mínimo del ERP frente a la última corrida buena', ayuda: '0.7 = si el ERP trae menos del 70%, la corrida se cancela.' },
  { key: 'max_huerfanos', label: 'Máximo de huérfanos a ocultar', ayuda: 'Si hay más, no se oculta ninguno.' },
  { key: 'skus_excluidos', label: 'SKU excluidos', tipo: 'textarea', ayuda: 'Separados por coma. No se crean ni se actualizan; si están publicados pasan a borrador.' },
];

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  queued: { texto: 'En cola', clase: 'bg-gray-100 text-gray-700' },
  running: { texto: 'En curso', clase: 'bg-blue-100 text-blue-700' },
  done: { texto: 'Correcta', clase: 'bg-green-100 text-green-700' },
  done_with_errors: { texto: 'Con errores', clase: 'bg-amber-100 text-amber-800' },
  error: { texto: 'Error', clase: 'bg-red-100 text-red-700' },
  skipped: { texto: 'Omitida', clase: 'bg-gray-100 text-gray-500' },
};

const ORIGENES: Record<string, string> = { boton: 'Botón WP', cron: 'Programada', manual: 'Manual' };

const fecha = (v: string | null) =>
  v ? new Date(v).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'medium' }) : '-';

async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

function Estado({ status }: { status: string }) {
  const e = ESTADOS[status] || { texto: status, clase: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.clase}`}>{e.texto}</span>;
}

export default function ModSincronizadorRepuestosRepuestera({ moduleData }: { moduleData: ModuleData }) {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [runs, setRuns] = useState<Run[]>([]);
  const [enCurso, setEnCurso] = useState(false);
  const [modoSimulacion, setModoSimulacion] = useState(true);
  const [ultimoTotal, setUltimoTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lanzando, setLanzando] = useState(false);

  const [config, setConfig] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [mensajeConfig, setMensajeConfig] = useState<string | null>(null);

  const [runSel, setRunSel] = useState<number | null>(null);
  const [skuFiltro, setSkuFiltro] = useState('');
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [runDetalle, setRunDetalle] = useState<Run | null>(null);
  const [cargandoLogs, setCargandoLogs] = useState(false);

  const cargarStatus = useCallback(async () => {
    try {
      const d = await api<{ en_curso: boolean; runs: Run[]; modo_simulacion: boolean; ultimo_total_erp: number }>(`${BASE}/status`);
      setRuns(d.runs);
      setEnCurso(d.en_curso);
      setModoSimulacion(d.modo_simulacion);
      setUltimoTotal(d.ultimo_total_erp);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const cargarConfig = useCallback(async () => {
    try {
      const d = await api<{ config: Record<string, string | null> }>(`${BASE}/config`);
      const limpio: Record<string, string> = {};
      for (const [k, v] of Object.entries(d.config)) limpio[k] = v ?? '';
      setConfig(limpio);
    } catch (e: any) {
      setMensajeConfig(e.message);
    }
  }, []);

  const cargarLogs = useCallback(async (id: number, sku: string) => {
    setCargandoLogs(true);
    try {
      const d = await api<{ run: Run; logs: LogRow[] }>(`${BASE}/logs?run_id=${id}${sku ? `&sku=${encodeURIComponent(sku)}` : ''}`);
      setLogs(d.logs);
      setRunDetalle(d.run);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargandoLogs(false);
    }
  }, []);

  useEffect(() => {
    cargarStatus();
  }, [cargarStatus]);

  useEffect(() => {
    if (activeTab === 'config') cargarConfig();
    if (activeTab === 'logs' && runSel == null && runs[0]) setRunSel(runs[0].id);
  }, [activeTab, cargarConfig, runSel, runs]);

  useEffect(() => {
    if (activeTab === 'logs' && runSel != null) cargarLogs(runSel, skuFiltro);
    // El filtro por SKU se aplica con el boton Buscar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, runSel, cargarLogs]);

  useEffect(() => {
    const activa = enCurso || runs.some((r) => r.status === 'queued' || r.status === 'running');
    if (!activa) return;
    const t = setInterval(cargarStatus, 3000);
    return () => clearInterval(t);
  }, [enCurso, runs, cargarStatus]);

  const ejecutar = async (simulacion: boolean, forzado = false) => {
    if (!simulacion && !confirm('Esta corrida escribe en la tienda y avisa a WordPress. ¿Continuar?')) return;
    setLanzando(true);
    try {
      await api(`${BASE}/ejecutar`, { method: 'POST', body: JSON.stringify({ simulacion, forzado }) });
      await cargarStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLanzando(false);
    }
  };

  const guardarConfig = async () => {
    setGuardando(true);
    setMensajeConfig(null);
    try {
      const d = await api<{ config: Record<string, string | null> }>(`${BASE}/config`, { method: 'PUT', body: JSON.stringify(config) });
      const limpio: Record<string, string> = {};
      for (const [k, v] of Object.entries(d.config)) limpio[k] = v ?? '';
      setConfig(limpio);
      setMensajeConfig('Configuración guardada');
      cargarStatus();
    } catch (e: any) {
      setMensajeConfig(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const ultima = runs[0];
  const ultimaCaida = ultima?.status === 'error' && /% de la referencia/.test(ultima.motivo_error || '');
  const corriendo = enCurso || runs.some((r) => r.status === 'queued' || r.status === 'running');
  const statsDetalle = (() => {
    try { return runDetalle?.stats ? JSON.parse(runDetalle.stats) : null; } catch { return null; }
  })();

  return (
    <div className="w-full p-4 md:p-6 space-y-4">
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl">
        {activeTab === 'inicio' && (
          <div className="space-y-4 p-4">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
              <h3 className="text-xl font-bold mb-1">{moduleData.title}</h3>
              <p className="text-purple-100 text-sm">
                ERP Repuestera a WooCommerce (repuestera.com.co): stock, precios por tipo de cliente, categorías y huérfanos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Modo</p>
                <p className={`font-semibold ${modoSimulacion ? 'text-amber-700' : 'text-green-700'}`}>
                  {modoSimulacion ? 'Simulación (no escribe)' : 'Real'}
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Estado</p>
                <p className="font-semibold text-gray-900">
                  {corriendo ? `En curso${ultima?.paso ? `: ${ultima.paso}` : ''}` : 'Sin corridas en curso'}
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Referencia de la protección del ERP</p>
                <p className="font-semibold text-gray-900">{ultimoTotal ? `${ultimoTotal} productos` : 'Productos visibles de la tienda'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={corriendo || lanzando}
                onClick={() => ejecutar(true)}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Ejecutar simulación
              </button>
              <button
                type="button"
                disabled={corriendo || lanzando || modoSimulacion}
                title={modoSimulacion ? 'Desactiva el modo simulación en Configuración' : ''}
                onClick={() => ejecutar(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Ejecutar sincronización real
              </button>
              {ultimaCaida && (
                <button
                  type="button"
                  disabled={corriendo || lanzando}
                  onClick={() => ejecutar(modoSimulacion, true)}
                  className="px-4 py-2 text-sm rounded-lg border border-amber-400 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                >
                  Aprobar caída del ERP y ejecutar
                </button>
              )}
            </div>

            {ultima?.status === 'error' && ultima.motivo_error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                Última corrida con error: {ultima.motivo_error}
              </div>
            )}

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    {['#', 'Inicio', 'Origen', 'Modo', 'Estado', 'ERP', 'Creados', 'Actualizados', 'Sin cambios', 'Errores', 'Duración', 'Aviso WP'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runs.length === 0 && (
                    <tr><td colSpan={12} className="text-center text-gray-400 py-6">Sin corridas aún</td></tr>
                  )}
                  {runs.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => { setRunSel(r.id); setActiveTab('logs'); }}
                    >
                      <td className="px-3 py-2">{r.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fecha(r.started_at)}</td>
                      <td className="px-3 py-2">{ORIGENES[r.origen] || r.origen}</td>
                      <td className="px-3 py-2">{r.simulacion ? 'Simulación' : 'Real'}{r.forzado ? ' (aprobada)' : ''}</td>
                      <td className="px-3 py-2"><Estado status={r.status} /></td>
                      <td className="px-3 py-2">{r.total_erp ?? '-'}</td>
                      <td className="px-3 py-2">{r.creados}</td>
                      <td className="px-3 py-2">{r.actualizados}</td>
                      <td className="px-3 py-2">{r.sin_cambios}</td>
                      <td className="px-3 py-2">{r.errores}</td>
                      <td className="px-3 py-2">{r.duracion_segundos != null ? `${r.duracion_segundos} s` : '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.callback_status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Configuración</h3>
            <p className="text-xs text-gray-500">
              Las claves se guardan cifradas y se muestran enmascaradas. Si no cambias un campo enmascarado, se conserva el valor guardado.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CAMPOS.map((c) => (
                <div key={c.key} className={c.tipo === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{c.label}</label>
                  {c.tipo === 'modo' ? (
                    <select
                      value={config[c.key] === '0' ? '0' : '1'}
                      onChange={(e) => setConfig({ ...config, [c.key]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="1">Simulación (no escribe)</option>
                      <option value="0">Real</option>
                    </select>
                  ) : c.tipo === 'textarea' ? (
                    <textarea
                      rows={4}
                      value={config[c.key] || ''}
                      onChange={(e) => setConfig({ ...config, [c.key]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  ) : (
                    <input
                      type={c.tipo === 'password' ? 'password' : 'text'}
                      autoComplete="off"
                      value={config[c.key] || ''}
                      onChange={(e) => setConfig({ ...config, [c.key]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  )}
                  {c.ayuda && <p className="text-xs text-gray-500 mt-1">{c.ayuda}</p>}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={guardando}
                onClick={guardarConfig}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              {mensajeConfig && <span className="text-sm text-gray-600">{mensajeConfig}</span>}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={runSel ?? ''}
                onChange={(e) => setRunSel(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} {fecha(r.started_at)} {r.simulacion ? '(simulación)' : ''} {ESTADOS[r.status]?.texto || r.status}
                  </option>
                ))}
              </select>
              <input
                value={skuFiltro}
                onChange={(e) => setSkuFiltro(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && runSel != null) cargarLogs(runSel, skuFiltro); }}
                placeholder="Filtrar por SKU..."
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => runSel != null && cargarLogs(runSel, skuFiltro)}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Buscar
              </button>
              <span className="text-sm text-gray-500">{logs.length} registros</span>
            </div>

            {runDetalle?.motivo_error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{runDetalle.motivo_error}</div>
            )}

            {statsDetalle && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {[
                  ['Productos en la tienda', statsDetalle.existentes_en_woo],
                  ['Huérfanos detectados', statsDetalle.huerfanos_detectados],
                  ['Huérfanos ocultados', statsDetalle.huerfanos_ocultados],
                  ['Excluidos ignorados', statsDetalle.excluidos_ignorados_del_erp],
                  ['Excluidos a borrador', statsDetalle.excluidos_pasados_a_borrador?.length ?? 0],
                  ['Reaparecidos', statsDetalle.reaparecidos_visibles?.length ?? 0],
                  ['Con código anterior', statsDetalle.emparejados_codigo_anterior?.length ?? 0],
                  ['Sin categoría', statsDetalle.sin_categoria],
                ].map(([k, v]) => (
                  <div key={String(k)} className="border border-gray-200 rounded-lg p-2">
                    <p className="text-gray-500">{k}</p>
                    <p className="font-semibold text-gray-900">{v ?? '-'}</p>
                  </div>
                ))}
              </div>
            )}

            {cargandoLogs ? (
              <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin registros</p>
            ) : (
              <div className="max-h-[32rem] overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      {['Hora', 'SKU', 'Acción', 'Resultado', 'Detalle'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-t border-gray-100 align-top">
                        <td className="px-3 py-2 whitespace-nowrap">{fecha(l.created_at)}</td>
                        <td className="px-3 py-2 font-mono">{l.sku || '-'}</td>
                        <td className="px-3 py-2">{l.accion}</td>
                        <td className={`px-3 py-2 ${l.resultado === 'error' ? 'text-red-600 font-medium' : ''}`}>{l.resultado}</td>
                        <td className="px-3 py-2 text-gray-700">{l.detalle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documentacion' && (
          <div className="p-4 space-y-4 text-sm text-gray-700">
            <h3 className="font-semibold text-gray-900">Documentación</h3>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">Qué hace</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Lee el catálogo completo del ERP (páginas de 500) y el inventario de WooCommerce.</li>
                <li>Crea lo que no existe, actualiza solo lo que cambió (stock, precios 1 a 10, clase, grupo, subgrupos, contable, IVA) y vuelve visible lo oculto que regresa del ERP.</li>
                <li>Oculta con stock 0 los productos que ya no vienen del ERP (huérfanos). No los borra.</li>
                <li>Los SKU excluidos no se crean ni se actualizan; si están publicados pasan a borrador.</li>
                <li>Al crear un producto busca su versión anterior (mismo código base o mismo nombre) y le pasa la meta codigo_anterior y la foto.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">Protecciones</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Si el catálogo del ERP llega incompleto o falla una lectura, se reintenta 3 veces con 5 segundos de espera. Si sigue fallando, la corrida termina en error sin escribir nada.</li>
                <li>Si el ERP trae menos del mínimo configurado frente a la última corrida buena, la corrida se cancela. Se puede aprobar a mano desde Inicio.</li>
                <li>Los productos ocultos no cuentan para esa comparación.</li>
                <li>Nunca corren dos sincronizaciones a la vez (lock en MySQL).</li>
                <li>Si una clase no tiene categoría, el producto nuevo queda sin categoría y el existente conserva la suya; se registra como error.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">Endpoints</p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
                <li>POST {BASE}/webhook (header X-Sync-Token): botón Sincronizar del plugin.</li>
                <li>POST {BASE}/precios (header X-Sync-Token): botón Ver todos los precios.</li>
                <li>POST {BASE}/cron (header X-Cron-Secret): corrida programada.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">Paso a producción</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Cambiar el modo a Real en Configuración.</li>
                <li>Apuntar REPUESTERA_N8N_WEBHOOK_URL y REPUESTERA_N8N_ALL_PRICES_URL de wp-config.php a los endpoints de arriba.</li>
                <li>Agregar el cron cada 10 minutos en el servidor.</li>
                <li>Desactivar en n8n los workflows CzgPuZ3f5m4Mx6V6 y qilWmNyIav5JHVIw.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

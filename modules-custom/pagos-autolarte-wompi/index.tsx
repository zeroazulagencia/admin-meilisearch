'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE = '/api/custom-module16/pagos-autolarte-wompi';

type LogEntry = {
  wompi_id: string;
  status: string;
  amount_in_cents: number;
  reference: string;
  customer_email: string;
  payment_method_type: string;
  currency: string;
  created_at_wompi: string;
  finalized_at_wompi: string;
  synced_at: string;
};

type Stats = {
  byStatus: { status: string; count: number; total_cents: number }[];
  lastSync: string | null;
  total: number;
  last30Days: { day: string; count: number; approved_cents: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  ERROR: 'bg-yellow-100 text-yellow-800',
};

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    cents / 100
  );
}

function formatDate(dt: string | null): string {
  if (!dt) return '-';
  return new Date(dt).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function PagosAutolarteModule() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transacciones' | 'sync'>('dashboard');

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const r = await fetch(`${BASE}/stats`);
      const j = await r.json();
      if (j.ok) setStats(j);
    } catch (e) { console.error(e); }
    finally { setLoadingStats(false); }
  }, []);

  const loadLogs = useCallback(async (p = 1) => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      if (filterStatus) params.set('status', filterStatus);
      if (filterSearch) params.set('search', filterSearch);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      const r = await fetch(`${BASE}/logs?${params}`);
      const j = await r.json();
      if (j.ok) {
        setLogs(j.logs);
        setTotal(j.total);
        setPages(j.pages);
        setPage(p);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingLogs(false); }
  }, [filterStatus, filterSearch, filterDateFrom, filterDateTo]);

  const doSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await fetch(`${BASE}/logs`, { method: 'POST' });
      const j = await r.json();
      setSyncResult(j);
      if (j.ok) { loadStats(); if (activeTab === 'transacciones') loadLogs(1); }
    } catch (e: any) {
      setSyncResult({ ok: false, error: e.message });
    } finally { setSyncing(false); }
  };

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (activeTab === 'transacciones') loadLogs(1); }, [activeTab, loadLogs]);

  const approvedStats = stats?.byStatus.find(s => s.status === 'APPROVED');
  const declinedStats = stats?.byStatus.find(s => s.status === 'DECLINED');
  const errorStats = stats?.byStatus.find(s => s.status === 'ERROR');

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard' },
    { id: 'transacciones' as const, label: 'Transacciones' },
    { id: 'sync' as const, label: 'Sincronizar' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="space-y-4">
        {/* Header + tabs */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pagos Wompi — Autolarte</h2>
          <p className="text-xs text-gray-500 mb-2">Transacciones de autolarte.com.co</p>
          <div className="flex gap-1 border-b border-gray-200">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {loadingStats ? (
              <p className="text-sm text-gray-500">Cargando estadísticas...</p>
            ) : stats ? (
              <>
                {/* Cards stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">Total transacciones</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-700">Aprobadas</p>
                    <p className="text-2xl font-bold text-green-800">{approvedStats?.count || 0}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {approvedStats ? formatCOP(approvedStats.total_cents) : '$0'}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-red-700">Declinadas</p>
                    <p className="text-2xl font-bold text-red-800">{declinedStats?.count || 0}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <p className="text-xs text-yellow-700">Error</p>
                    <p className="text-2xl font-bold text-yellow-800">{errorStats?.count || 0}</p>
                  </div>
                </div>

                {/* Último sync */}
                <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 border border-gray-200">
                  Última sincronización: {stats.lastSync ? formatDate(stats.lastSync) : 'Nunca — usa la pestaña Sincronizar'}
                </div>

                {/* Tabla últimos 30 días */}
                {stats.last30Days.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Últimos 30 días</h3>
                    <div className="overflow-auto max-h-64 border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600">Fecha</th>
                            <th className="px-3 py-2 text-right text-gray-600">Transacciones</th>
                            <th className="px-3 py-2 text-right text-gray-600">Monto aprobado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.last30Days.map((d, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-1.5 text-gray-800">{d.day}</td>
                              <td className="px-3 py-1.5 text-right text-gray-700">{d.count}</td>
                              <td className="px-3 py-1.5 text-right text-green-700">{formatCOP(d.approved_cents)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                No hay datos. Ve a la pestaña <strong>Sincronizar</strong> para importar los logs de Autolarte.
              </div>
            )}
          </div>
        )}

        {/* TRANSACCIONES TAB */}
        {activeTab === 'transacciones' && (
          <div className="space-y-3">
            {/* Filtros */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="APPROVED">APPROVED</option>
                <option value="DECLINED">DECLINED</option>
                <option value="ERROR">ERROR</option>
              </select>
              <input
                type="text"
                placeholder="Buscar ID, email, ref..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm col-span-1 sm:col-span-1"
              />
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <button
              onClick={() => loadLogs(1)}
              disabled={loadingLogs}
              className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {loadingLogs ? 'Cargando...' : 'Aplicar filtros'}
            </button>

            {/* Total */}
            <p className="text-xs text-gray-500">{total} transacciones encontradas</p>

            {/* Tabla */}
            <div className="overflow-auto border border-gray-200 rounded-lg max-h-96">
              <table className="w-full text-xs min-w-[600px]">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left text-gray-600">ID Wompi</th>
                    <th className="px-2 py-2 text-left text-gray-600">Estado</th>
                    <th className="px-2 py-2 text-right text-gray-600">Monto</th>
                    <th className="px-2 py-2 text-left text-gray-600">Email</th>
                    <th className="px-2 py-2 text-left text-gray-600">Método</th>
                    <th className="px-2 py-2 text-left text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.wompi_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-2 py-1.5 font-mono text-gray-700 whitespace-nowrap">{log.wompi_id}</td>
                      <td className="px-2 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-800'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-800 whitespace-nowrap">
                        {log.amount_in_cents ? formatCOP(log.amount_in_cents) : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-gray-600 max-w-[150px] truncate">{log.customer_email}</td>
                      <td className="px-2 py-1.5 text-gray-600">{log.payment_method_type}</td>
                      <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{formatDate(log.created_at_wompi)}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && !loadingLogs && (
                    <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400">Sin resultados</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pages > 1 && (
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={() => loadLogs(page - 1)}
                  disabled={page <= 1 || loadingLogs}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <span className="text-xs text-gray-600">Página {page} de {pages}</span>
                <button
                  onClick={() => loadLogs(page + 1)}
                  disabled={page >= pages || loadingLogs}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        )}

        {/* SYNC TAB */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-1">Sincronización manual</h3>
              <p className="text-sm text-blue-700">
                Descarga el archivo de logs de <code className="bg-blue-100 px-1 rounded">autolarte.com.co/dev/log_zero.txt</code> y lo importa a la base de datos local.
                Los registros ya existentes no se duplican.
              </p>
            </div>

            <button
              onClick={doSync}
              disabled={syncing}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>

            {syncResult && (
              <div className={`p-4 rounded-lg border ${syncResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {syncResult.ok ? (
                  <div className="text-sm text-green-800 space-y-1">
                    <p className="font-semibold">Sincronización completada</p>
                    <p>Nuevos registros importados: <strong>{syncResult.inserted}</strong></p>
                    <p>Ya existían (omitidos): <strong>{syncResult.skipped}</strong></p>
                    {syncResult.errors > 0 && <p>Errores de parseo: {syncResult.errors}</p>}
                    <p className="text-xs text-green-600 mt-1">Total procesados: {syncResult.total}</p>
                  </div>
                ) : (
                  <p className="text-sm text-red-700">{syncResult.error}</p>
                )}
              </div>
            )}

            {stats?.lastSync && (
              <p className="text-xs text-gray-500">
                Última sincronización: {formatDate(stats.lastSync)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

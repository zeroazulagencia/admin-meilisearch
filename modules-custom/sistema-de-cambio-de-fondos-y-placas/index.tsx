'use client';

import { useEffect, useState } from 'react';

export default function SistemaCambioFondosPlacasModule() {
  const [activeTab, setActiveTab] = useState<'logs' | 'config' | 'cron' | 'docs'>('logs');
  const [config, setConfig] = useState<Record<string, string | null>>({});
  const [configForm, setConfigForm] = useState({
    autolarte_base_url: '',
    uploads_path: '',
    cronjobs_path: '',
    plate_assistant_path: '',
    wp_db_host: '',
    wp_db_port: '',
    wp_db_name: '',
    wp_db_user: '',
    wp_db_password: '',
    wp_table_prefix: '',
    wp_api_base_url: '',
    wp_api_token: '',
    wp_api_upload_endpoint: '',
    wp_api_override_endpoint: '',
    wp_api_list_large_endpoint: '',
    wp_api_get_base64_endpoint: '',
    cron_times: '',
    replicate_api_token: '',
    replicate_model: '',
    rapidapi_key: '',
    rapidapi_host: '',
    rapidapi_endpoint: '',
    prompt_default: '',
    concesionario_json_url: '',
    category_json_path: '',
    vehicles_json_path: '',
    server_search_url: '',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<Record<string, string> | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string> | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [runningAuto, setRunningAuto] = useState(false);
  const [runningCompress, setRunningCompress] = useState(false);
  const [runningManual, setRunningManual] = useState(false);
  const [runningTest, setRunningTest] = useState(false);
  const [testSteps, setTestSteps] = useState<Array<{ step: string; status: string; detail?: string }> | null>(null);
  const [manualPlates, setManualPlates] = useState('');
  const [autoLimit, setAutoLimit] = useState('50');
  const [compressLimit, setCompressLimit] = useState('50');
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<Array<{ label: string; status?: string; message?: string }> | null>(null);
  const [runStats, setRunStats] = useState<{ total?: number; ok?: number; errors?: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | 'auto' | 'compress' | 'manual' | 'test'>(null);

  const formatRunSummary = (label: string, payload: any) => {
    if (!payload || typeof payload !== 'object') return `${label} ejecutado`;
    const summary = payload.summary || {};
    const total = typeof summary.totalRows === 'number' ? summary.totalRows : typeof payload.count === 'number' ? payload.count : null;
    const processed = typeof summary.processed === 'number' ? summary.processed : null;
    const errors = typeof summary.errors === 'number' ? summary.errors : null;
    if (total === 0) {
      return `${label}: no hay elementos pendientes para procesar`;
    }
    if (total !== null && processed !== null && errors !== null) {
      if (!errors) {
        return `${label}: ${processed}/${total} completado${processed === 1 ? '' : 's'} sin errores`;
      }
      return `${label}: ${processed}/${total} completado${processed === 1 ? '' : 's'}, ${errors} error${errors === 1 ? '' : 'es'}`;
    }
    if (total !== null) {
      return `${label}: ${total} elemento${total === 1 ? '' : 's'} procesado${total === 1 ? '' : 's'}`;
    }
    return `${label} ejecutado`;
  };

  const extractRunDetails = (payload: any) => {
    if (Array.isArray(payload?.summary?.details) && payload.summary.details.length) {
      return payload.summary.details.map((item: any, index: number) => ({
        label: item?.plate || item?.filename || `item-${index + 1}`,
        status: item?.status || 'info',
        message: item?.detail || item?.error || '',
      }));
    }
    if (!Array.isArray(payload?.results) || !payload.results.length) return null;
    return payload.results.map((item: any, index: number) => ({
      label: item?.plate || item?.filename || `item-${index + 1}`,
      status: item?.status || 'info',
      message: item?.error || item?.detail || '',
    }));
  };

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/config');
      const json = await res.json();
      if (json.ok) {
        const cfg = json.config || {};
        setConfig(cfg);
        setConfigForm({
          autolarte_base_url: cfg.autolarte_base_url || '',
          uploads_path: cfg.uploads_path || '',
          cronjobs_path: cfg.cronjobs_path || '',
          plate_assistant_path: cfg.plate_assistant_path || '',
          wp_db_host: cfg.wp_db_host || '',
          wp_db_port: cfg.wp_db_port || '',
          wp_db_name: cfg.wp_db_name || '',
          wp_db_user: cfg.wp_db_user || '',
          wp_db_password: '',
          wp_table_prefix: cfg.wp_table_prefix || '',
          wp_api_base_url: cfg.wp_api_base_url || '',
          wp_api_token: '',
          wp_api_upload_endpoint: cfg.wp_api_upload_endpoint || '',
          wp_api_override_endpoint: cfg.wp_api_override_endpoint || '',
          wp_api_list_large_endpoint: cfg.wp_api_list_large_endpoint || '',
          wp_api_get_base64_endpoint: cfg.wp_api_get_base64_endpoint || '',
          cron_times: cfg.cron_times || '',
          replicate_api_token: '',
          replicate_model: cfg.replicate_model || '',
          rapidapi_key: '',
          rapidapi_host: cfg.rapidapi_host || '',
          rapidapi_endpoint: cfg.rapidapi_endpoint || '',
          prompt_default: cfg.prompt_default || '',
          concesionario_json_url: cfg.concesionario_json_url || '',
          category_json_path: cfg.category_json_path || '',
          vehicles_json_path: cfg.vehicles_json_path || '',
          server_search_url: cfg.server_search_url || '',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/logs?limit=200');
      const json = await res.json();
      if (json.ok) setLogs(json.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  const saveConfig = async () => {
    setSavingConfig(true);
    setValidationResult(null);
    setValidationDetails(null);
    setValidationErrors(null);
    try {
      const payload: Record<string, string> = {};
      if (configForm.autolarte_base_url.trim()) payload.autolarte_base_url = configForm.autolarte_base_url.trim();
      if (configForm.uploads_path.trim()) payload.uploads_path = configForm.uploads_path.trim();
      if (configForm.cronjobs_path.trim()) payload.cronjobs_path = configForm.cronjobs_path.trim();
      if (configForm.plate_assistant_path.trim()) payload.plate_assistant_path = configForm.plate_assistant_path.trim();
      if (configForm.wp_db_host.trim()) payload.wp_db_host = configForm.wp_db_host.trim();
      if (configForm.wp_db_port.trim()) payload.wp_db_port = configForm.wp_db_port.trim();
      if (configForm.wp_db_name.trim()) payload.wp_db_name = configForm.wp_db_name.trim();
      if (configForm.wp_db_user.trim()) payload.wp_db_user = configForm.wp_db_user.trim();
      if (configForm.wp_db_password.trim()) payload.wp_db_password = configForm.wp_db_password.trim();
      if (configForm.wp_table_prefix.trim()) payload.wp_table_prefix = configForm.wp_table_prefix.trim();
      if (configForm.wp_api_base_url.trim()) payload.wp_api_base_url = configForm.wp_api_base_url.trim();
      if (configForm.wp_api_token.trim()) payload.wp_api_token = configForm.wp_api_token.trim();
      if (configForm.wp_api_upload_endpoint.trim()) payload.wp_api_upload_endpoint = configForm.wp_api_upload_endpoint.trim();
      if (configForm.wp_api_override_endpoint.trim()) payload.wp_api_override_endpoint = configForm.wp_api_override_endpoint.trim();
       if (configForm.wp_api_list_large_endpoint.trim()) payload.wp_api_list_large_endpoint = configForm.wp_api_list_large_endpoint.trim();
       if (configForm.wp_api_get_base64_endpoint.trim()) {
         payload.wp_api_get_base64_endpoint = configForm.wp_api_get_base64_endpoint.trim();
       }
      if (configForm.cron_times.trim()) payload.cron_times = configForm.cron_times.trim();
      if (configForm.replicate_api_token.trim()) payload.replicate_api_token = configForm.replicate_api_token.trim();
      if (configForm.replicate_model.trim()) payload.replicate_model = configForm.replicate_model.trim();
      if (configForm.rapidapi_key.trim()) payload.rapidapi_key = configForm.rapidapi_key.trim();
      if (configForm.rapidapi_host.trim()) payload.rapidapi_host = configForm.rapidapi_host.trim();
      if (configForm.rapidapi_endpoint.trim()) payload.rapidapi_endpoint = configForm.rapidapi_endpoint.trim();
      if (configForm.prompt_default.trim()) payload.prompt_default = configForm.prompt_default.trim();
      if (configForm.concesionario_json_url.trim()) {
        payload.concesionario_json_url = configForm.concesionario_json_url.trim();
      }
      if (configForm.category_json_path.trim()) payload.category_json_path = configForm.category_json_path.trim();
      if (configForm.vehicles_json_path.trim()) payload.vehicles_json_path = configForm.vehicles_json_path.trim();
      if (configForm.server_search_url.trim()) payload.server_search_url = configForm.server_search_url.trim();

      const res = await fetch('/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) {
        setValidationResult(json.error || 'Error al guardar');
      } else {
        await loadConfig();
        setConfigForm({
          autolarte_base_url: '',
          uploads_path: '',
          cronjobs_path: '',
          plate_assistant_path: '',
          wp_db_host: '',
          wp_db_port: '',
          wp_db_name: '',
          wp_db_user: '',
          wp_db_password: '',
          wp_table_prefix: '',
          wp_api_base_url: '',
          wp_api_token: '',
          wp_api_upload_endpoint: '',
          wp_api_override_endpoint: '',
          wp_api_list_large_endpoint: '',
          wp_api_get_base64_endpoint: '',
          cron_times: '',
          replicate_api_token: '',
          replicate_model: '',
          rapidapi_key: '',
          rapidapi_host: '',
          rapidapi_endpoint: '',
          prompt_default: '',
          concesionario_json_url: '',
          category_json_path: '',
          vehicles_json_path: '',
          server_search_url: '',
        });
        setValidationResult('Configuracion guardada');
      }
    } catch (e) {
      setValidationResult('Error al guardar');
    } finally {
      setSavingConfig(false);
    }
  };

  const validateConfig = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch('/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/validate', {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.ok) {
        setValidationResult(json.error || 'Validacion fallida');
      } else {
        const summary = json.summary || 'Validacion completada';
        setValidationResult(summary);
        setValidationDetails(json.results || null);
        setValidationErrors(json.details || null);
      }
    } catch (e) {
      setValidationResult('Validacion fallida');
    } finally {
      setValidating(false);
    }
  };

  const runAuto = async () => {
    setConfirmAction(null);
    setRunningAuto(true);
    setRunMessage(null);
    setRunDetails(null);
    setRunStats(null);
    try {
      const res = await fetch('/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/run-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: Number(autoLimit) || 50 }),
      });
      const json = await res.json();
      if (!json.ok) {
        setRunMessage(json.error || 'Error al ejecutar');
      } else {
        setRunMessage(json.message || formatRunSummary('Auto', json));
        setRunDetails(extractRunDetails(json));
        const summary = json.summary || {};
        setRunStats({ total: summary.totalRows ?? json.count, ok: summary.processed, errors: summary.errors });
      }
      await loadLogs();
    } finally {
      setRunningAuto(false);
    }
  };

  const runCompress = async () => {
    setConfirmAction(null);
    setRunningCompress(true);
    setRunMessage(null);
    setRunDetails(null);
    setRunStats(null);
    try {
      const res = await fetch('/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/run-compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: Number(compressLimit) || 50 }),
      });
      const json = await res.json();
      if (!json.ok) {
        setRunMessage(json.error || 'Error al ejecutar');
      } else {
        setRunMessage(json.message || formatRunSummary('Compresion', json));
        setRunDetails(extractRunDetails(json));
        const summary = json.summary || {};
        setRunStats({ total: summary.totalRows ?? json.count, ok: summary.processed, errors: summary.errors });
      }
      await loadLogs();
    } finally {
      setRunningCompress(false);
    }
  };

  const runManual = async () => {
    setConfirmAction(null);
    setRunningManual(true);
    setRunMessage(null);
    setRunDetails(null);
    setRunStats(null);
    try {
      const plates = manualPlates
        .split(/\n|,/)
        .map((p) => p.trim())
        .filter(Boolean);
      const res = await fetch('/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/run-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plates }),
      });
      const json = await res.json();
      if (!json.ok) {
        setRunMessage(json.error || 'Error al ejecutar');
      } else {
        setRunMessage(json.message || formatRunSummary('Manual', json));
        setRunDetails(extractRunDetails(json));
        const summary = json.summary || {};
        setRunStats({ total: summary.totalRows ?? json.count, ok: summary.processed, errors: summary.errors });
      }
      await loadLogs();
    } finally {
      setRunningManual(false);
    }
  };

  const runTest = async () => {
    setConfirmAction(null);
    setRunningTest(true);
    setRunMessage(null);
    setTestSteps(null);
    setRunDetails(null);
    setRunStats(null);
    try {
      const res = await fetch('/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/run-test', {
        method: 'POST',
      });
      const json = await res.json();
      if (json.ok) {
        setTestSteps(json.steps || []);
        setRunMessage('Prueba ejecutada');
      } else {
        setRunMessage(json.error || 'Error al ejecutar prueba');
      }
      await loadLogs();
    } finally {
      setRunningTest(false);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sistema de cambio de fondos y placas</h2>
            <p className="text-sm text-gray-600">Modulo 11 en preparacion.</p>
            <div className="flex gap-1 border-b border-gray-200 mt-3">
              {([
                { id: 'logs' as const, label: 'Logs' },
                { id: 'config' as const, label: 'Configuracion' },
                { id: 'cron' as const, label: 'Cronjobs' },
                { id: 'docs' as const, label: 'Documentacion' },
              ]).map((t) => (
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
          </div>

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Limite auto</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      value={autoLimit}
                      onChange={(e) => setAutoLimit(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Limite compresion</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      value={compressLimit}
                      onChange={(e) => setCompressLimit(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Placas (manual)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      value={manualPlates}
                      onChange={(e) => setManualPlates(e.target.value)}
                      placeholder="ABC123, DEF456"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction('auto')}
              disabled={runningAuto}
              title="Procesa automaticamente las placas pendientes tomando los parametros actuales"
              className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {runningAuto ? 'Ejecutando auto...' : 'Ejecutar auto'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction('compress')}
              disabled={runningCompress}
                    title="Recomprime las imagenes grandes existentes en WordPress para reducir peso"
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {runningCompress ? 'Ejecutando compresion...' : 'Ejecutar compresion'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction('manual')}
                    disabled={runningManual}
                    title="Procesa solamente las placas que escribas manualmente en el campo de arriba"
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {runningManual ? 'Ejecutando manual...' : 'Ejecutar manual'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction('test')}
                    disabled={runningTest}
                    title="Ejecuta un ciclo completo de prueba con una sola placa para validar el pipeline"
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {runningTest ? 'Probando...' : 'Probar sistema'}
                  </button>
                  <button
                    type="button"
                    onClick={loadLogs}
                    title="Actualiza la tabla inferior para ver los logs mas recientes"
                    className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                  >
                    Recargar logs
                  </button>
                </div>
                {runMessage && <div className="text-xs text-gray-600">{runMessage}</div>}
                {runStats && (
                  <div className="text-xs text-gray-600">
                    {`Resumen: ${(runStats.ok ?? 0)} ok / ${(runStats.total ?? 0)} total${typeof runStats.errors === 'number' ? `, ${runStats.errors} errores` : ''}`}
                  </div>
                )}
                {runStats && runStats.total === 0 && (
                  <div className="text-xs text-gray-500">No hay elementos pendientes; se registró un log de paso.</div>
                )}
                {runDetails && (
                  <div className="text-xs text-gray-700">
                    <div className="font-medium text-gray-900">Detalle de ejecucion</div>
                    <div className="mt-2 space-y-1">
                      {runDetails.map((item, index) => (
                        <div
                          key={`${item.label}-${index}`}
                          className="flex items-center justify-between rounded border border-gray-200 px-2 py-1"
                        >
                          <span className="text-gray-600">{item.label}</span>
                          <span className={item.status === 'success' ? 'text-green-600' : item.status === 'error' ? 'text-red-600' : 'text-gray-600'}>
                            {item.status || '-'}
                          </span>
                          <span className="text-gray-500 truncate max-w-[240px]">{item.message || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {testSteps && (
                  <div className="text-xs text-gray-700">
                    <div className="font-medium text-gray-900">Detalle prueba</div>
                    <div className="mt-2 space-y-1">
                      {testSteps.map((item, index) => (
                        <div key={`${item.step}-${index}`} className="flex items-center justify-between rounded border border-gray-200 px-2 py-1">
                          <span className="text-gray-600">{item.step}</span>
                          <span className={item.status === 'ok' ? 'text-green-600' : item.status === 'error' ? 'text-red-600' : 'text-gray-600'}>
                            {item.status}
                          </span>
                          <span className="text-gray-500 truncate max-w-[240px]">{item.detail || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                {loadingLogs ? (
                  <div className="text-sm text-gray-600">Cargando logs...</div>
                ) : logs.length === 0 ? (
                  <div className="text-sm text-gray-600">Sin registros aun.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="py-2 pr-3">Fecha</th>
                          <th className="py-2 pr-3">Placa</th>
                          <th className="py-2 pr-3">Flujo</th>
                          <th className="py-2 pr-3">Side</th>
                          <th className="py-2 pr-3">Estado</th>
                          <th className="py-2 pr-3">Paso</th>
                          <th className="py-2 pr-3">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-t border-gray-100">
                            <td className="py-2 pr-3 text-gray-600">{log.created_at}</td>
                            <td className="py-2 pr-3 text-gray-800">{log.plate}</td>
                            <td className="py-2 pr-3 text-gray-600">{log.flow}</td>
                            <td className="py-2 pr-3 text-gray-600">{log.side || '-'}</td>
                            <td className="py-2 pr-3 text-gray-600">{log.status}</td>
                            <td className="py-2 pr-3 text-gray-600">{log.step || '-'}</td>
                    <td className="py-2 pr-3 text-gray-500">
                      <span className="relative" title={log.error_message || ''}>
                        <span className="block max-w-[220px] truncate">{log.error_message || '-'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 text-sm text-gray-700">
              <p>Configura las credenciales y rutas requeridas para el pipeline.</p>
              <div>
                <a
                  href="/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/download-plugin?v=20260325"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                >
                  Descargar plugin WP (za-plate-assistant)
                </a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Base URL sitio Autolarte</label>
                  <input
                    type="text"
                    placeholder="https://autolarte.com.co"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.autolarte_base_url}
                    onChange={(e) => setConfigForm((f) => ({ ...f, autolarte_base_url: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ruta uploads usados</label>
                  <input
                    type="text"
                    placeholder="/wp-content/uploads/usados"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.uploads_path}
                    onChange={(e) => setConfigForm((f) => ({ ...f, uploads_path: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Directorio cronjobs</label>
                  <input
                    type="text"
                    placeholder="/dev/cronjobs"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.cronjobs_path}
                    onChange={(e) => setConfigForm((f) => ({ ...f, cronjobs_path: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Directorio plate-assistant</label>
                  <input
                    type="text"
                    placeholder="/dev/endpoints/plate-assistant"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.plate_assistant_path}
                    onChange={(e) => setConfigForm((f) => ({ ...f, plate_assistant_path: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP DB Host</label>
                  <input
                    type="text"
                    placeholder="localhost"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_db_host}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_db_host: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP DB Port</label>
                  <input
                    type="text"
                    placeholder="3306"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_db_port}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_db_port: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP DB Name</label>
                  <input
                    type="text"
                    placeholder="autolarte_wp"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_db_name}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_db_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP DB User</label>
                  <input
                    type="text"
                    placeholder="wp_user"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_db_user}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_db_user: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP DB Password</label>
                  <input
                    type="password"
                    placeholder={config.wp_db_password || '••••••••'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_db_password}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_db_password: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP Table Prefix</label>
                  <input
                    type="text"
                    placeholder="krh_"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_table_prefix}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_table_prefix: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP API Base URL</label>
                  <input
                    type="text"
                    placeholder="https://autolarte.com.co"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_api_base_url}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_api_base_url: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP API Token</label>
                  <input
                    type="password"
                    placeholder={config.wp_api_token || 'usuario:app_password'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_api_token}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_api_token: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP API Upload Endpoint</label>
                  <input
                    type="text"
                    placeholder="/wp-json/za-plate/v1/upload"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_api_upload_endpoint}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_api_upload_endpoint: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP API Override Endpoint</label>
                  <input
                    type="text"
                    placeholder="/wp-json/za-plate/v1/override"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_api_override_endpoint}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_api_override_endpoint: e.target.value }))}
                  />
                </div>
               <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">WP API List Large Endpoint</label>
                 <input
                   type="text"
                   placeholder="/wp-json/za-plate/v1/list-large"
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                   value={configForm.wp_api_list_large_endpoint}
                   onChange={(e) => setConfigForm((f) => ({ ...f, wp_api_list_large_endpoint: e.target.value }))}
                 />
               </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WP API Get Base64 Endpoint</label>
                  <input
                    type="text"
                    placeholder="/wp-json/za-plate/v1/get-base64"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.wp_api_get_base64_endpoint}
                    onChange={(e) => setConfigForm((f) => ({ ...f, wp_api_get_base64_endpoint: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cron (3 veces al dia)</label>
                  <input
                    type="text"
                    placeholder="06:00,12:00,18:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.cron_times}
                    onChange={(e) => setConfigForm((f) => ({ ...f, cron_times: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Replicate API Token</label>
                  <input
                    type="password"
                    placeholder={config.replicate_api_token || 'r8_...'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.replicate_api_token}
                    onChange={(e) => setConfigForm((f) => ({ ...f, replicate_api_token: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Replicate Modelo</label>
                  <input
                    type="text"
                    placeholder="bria/generate-background"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.replicate_model}
                    onChange={(e) => setConfigForm((f) => ({ ...f, replicate_model: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">RapidAPI Key</label>
                  <input
                    type="password"
                    placeholder={config.rapidapi_key || 'rapidapi_key'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.rapidapi_key}
                    onChange={(e) => setConfigForm((f) => ({ ...f, rapidapi_key: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">RapidAPI Host</label>
                  <input
                    type="text"
                    placeholder="cars-image-background-removal.p.rapidapi.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.rapidapi_host}
                    onChange={(e) => setConfigForm((f) => ({ ...f, rapidapi_host: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">RapidAPI Endpoint</label>
                  <input
                    type="text"
                    placeholder="/v1/results?mode=fg-image"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.rapidapi_endpoint}
                    onChange={(e) => setConfigForm((f) => ({ ...f, rapidapi_endpoint: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Prompt default</label>
                  <input
                    type="text"
                    placeholder="In the city, clean background, no text..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.prompt_default}
                    onChange={(e) => setConfigForm((f) => ({ ...f, prompt_default: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Inventario JSON (Concesionario Virtual)</label>
                  <input
                    type="text"
                    placeholder="https://autolarte.concesionariovirtual.co/usados/parametros/inventario.json"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.concesionario_json_url}
                    onChange={(e) => setConfigForm((f) => ({ ...f, concesionario_json_url: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Archivo category.json</label>
                  <input
                    type="text"
                    placeholder="/dev/cronjobs/category.json"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.category_json_path}
                    onChange={(e) => setConfigForm((f) => ({ ...f, category_json_path: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Archivo vehicles.json</label>
                  <input
                    type="text"
                    placeholder="/dev/endpoints/plate-assistant/vehicles.json"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.vehicles_json_path}
                    onChange={(e) => setConfigForm((f) => ({ ...f, vehicles_json_path: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notificaciones (server-search)</label>
                  <input
                    type="text"
                    placeholder="https://server-search.zeroazul.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={configForm.server_search_url}
                    onChange={(e) => setConfigForm((f) => ({ ...f, server_search_url: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveConfig}
                  disabled={savingConfig}
                  className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {savingConfig ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={validateConfig}
                  disabled={validating}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {validating ? 'Validando...' : 'Validar claves y endpoints'}
                </button>
              </div>
              {validationResult && (
                <div className="text-xs text-gray-600">{validationResult}</div>
              )}
              {validationDetails && (
                <div className="text-xs text-gray-700">
                  <div className="font-medium text-gray-900">Detalle validacion</div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(validationDetails).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded border border-gray-200 px-2 py-1">
                        <span className="text-gray-600">{key}</span>
                        <span className={value === 'ok' ? 'text-green-600' : 'text-red-600'}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {validationErrors && (
                <div className="text-xs text-gray-600">
                  <div className="font-medium text-gray-900">Errores de conexion</div>
                  <div className="mt-2 space-y-1">
                    {Object.entries(validationErrors).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded border border-gray-200 px-2 py-1">
                        <span className="text-gray-600">{key}</span>
                        <span className="text-red-600">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cron' && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 text-sm text-gray-700">
              <div className="font-medium text-gray-900">Cron configurado</div>
              <div>Horarios: {config.cron_times || 'Sin configurar'}</div>
              <div className="text-xs text-gray-600">Ejemplo crontab (America/Bogota):</div>
              <pre className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs overflow-x-auto">
0 6,12,18 * * * curl -s -X POST "https://workers.zeroazul.com/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/run-auto"
              </pre>
              <div className="text-xs text-gray-600">Ajusta los horarios en Configuracion (cron_times).</div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 text-sm text-gray-700">
              <div>
                <div className="font-medium text-gray-900">Descripcion general</div>
                <p>
                  El modulo 11 reemplaza los scripts PHP legacy y centraliza todo el pipeline de cambio de fondos y
                  ocultamiento de placas para Autolarte usados. El modulo consulta la BD de WordPress para identificar
                  vehiculos pendientes, procesa IA con Replicate, oculta placas con RapidAPI y guarda imagenes mediante
                  el plugin WP (za-plate).
                </p>
              </div>
              <div>
                <div className="font-medium text-gray-900">Arquitectura</div>
                <p>
                  Fuente de inventario: JSON de Concesionario Virtual. Fuente de estado en WordPress: tabla
                  <span className="font-medium"> krh_jet_cct_cct_vehiculos_usados</span>. No hay acceso al filesystem de WP
                  desde este servidor, por eso las imagenes se escriben con endpoints del plugin.
                </p>
              </div>
              <div>
                <div className="font-medium text-gray-900">Tablas de base de datos</div>
                <p>1) Configuracion: modulos_sistema_de_cambio_de_fondos_y_placas_11_config.</p>
                <p>2) Logs: modulos_sistema_de_cambio_de_fondos_y_placas_11_logs.</p>
                <p>3) WordPress: krh_jet_cct_cct_vehiculos_usados (placa, titulo, imagenes_procesadas).</p>
              </div>
              <div>
                <div className="font-medium text-gray-900">Configuracion requerida</div>
                <p>
                  Claves principales: wp_db_host, wp_db_name, wp_db_user, wp_db_password, wp_api_base_url,
                  wp_api_token, replicate_api_token, rapidapi_key, cron_times.
                </p>
                <p>
                  Endpoints WP: wp_api_upload_endpoint, wp_api_override_endpoint, wp_api_list_large_endpoint.
                </p>
              </div>
              <div>
                <div className="font-medium text-gray-900">Endpoints del modulo</div>
                <p>/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/config (GET/PUT)</p>
                <p>/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/validate (POST)</p>
                <p>/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/run-auto (POST)</p>
                <p>/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/run-compress (POST)</p>
                <p>/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/run-manual (POST)</p>
                <p>/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/run-test (POST)</p>
                <p>/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/logs (GET)</p>
              </div>
              <div>
                <div className="font-medium text-gray-900">Endpoints WordPress (plugin za-plate)</div>
                <p>/wp-json/za-plate/v1/upload</p>
                <p>/wp-json/za-plate/v1/override</p>
                <p>/wp-json/za-plate/v1/list-large</p>
              </div>
              <div>
                <div className="font-medium text-gray-900">Flujos de procesamiento</div>
                <p>
                  <span className="font-medium">Auto:</span> filtra placas con imagenes_procesadas = "no", selecciona
                  prompt por categoria, procesa frontright/frontleft con Replicate, sube imagenes y marca
                  imagenes_procesadas = "si".
                </p>
                <p>
                  <span className="font-medium">Compresion:</span> obtiene archivos grandes desde WP API, llama RapidAPI
                  para ocultar placas y sobrescribe la imagen en WP.
                </p>
                <p>
                  <span className="font-medium">Manual:</span> reprocesa placas especificas definidas por el operador.
                </p>
                <p>
                  <span className="font-medium">Probar sistema:</span> ejecuta un caso controlado y devuelve un log paso a
                  paso.
                </p>
              </div>
              <div>
                <div className="font-medium text-gray-900">Cronjobs</div>
                <p>El cron externo dispara run-auto 3 veces al dia segun cron_times (configurable).</p>
                <pre className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs overflow-x-auto">
0 6,12,18 * * * curl -s -X POST "https://workers.zeroazul.com/api/custom-module11/sistema-de-cambio-de-fondos-y-placas/run-auto"
                </pre>
              </div>
              <div>
                <div className="font-medium text-gray-900">Instalacion del plugin</div>
                <p>Descargar el ZIP desde la pestaña Configuracion y subirlo en WordPress:</p>
                <p>Plugins &gt; Agregar nuevo &gt; Subir plugin &gt; Activar.</p>
              </div>
              <div>
                <div className="font-medium text-gray-900">Seguridad</div>
                <p>
                  Los secretos se almacenan en BD con encriptacion. El acceso a endpoints WP usa Application Passwords
                  (Basic Auth). No existe acceso directo al filesystem de WP desde este servidor.
                </p>
              </div>
              <div>
                <div className="font-medium text-gray-900">Solucion de problemas</div>
                <p>wp_api_token invalid: confirmar usuario real y app password sin espacios.</p>
                <p>rapidapi_ipset: si no existe ipset, el warning es informativo.</p>
                <p>run-auto sin cambios: verificar imagenes_procesadas en WP y logs del modulo.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Confirmar accion</h3>
            <p className="text-sm text-gray-600">
              {confirmAction === 'auto' && 'Procesara automaticamente las placas pendientes con la configuracion actual.'}
              {confirmAction === 'compress' && 'Recomprimira las imagenes existentes en WordPress para reducir su peso.'}
              {confirmAction === 'manual' && 'Procesara unicamente las placas que escribiste manualmente.'}
              {confirmAction === 'test' && 'Ejecutara un ciclo completo con una sola placa para validar el pipeline.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                onClick={() => setConfirmAction(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg"
                onClick={() => {
                  if (confirmAction === 'auto') runAuto();
                  if (confirmAction === 'compress') runCompress();
                  if (confirmAction === 'manual') runManual();
                  if (confirmAction === 'test') runTest();
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

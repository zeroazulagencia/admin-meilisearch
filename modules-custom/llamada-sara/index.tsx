'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Llamada {
  id: number;
  room_id: string;
  estado: 'activa' | 'finalizada' | 'cancelada';
  creado_por: string;
  cliente_id: string | null;
  inicio_llamada: string | null;
  fin_llamada: string | null;
  duracion_segundos: number | null;
  recording_url: string | null;
  created_at: string;
}

interface Stats {
  total_llamadas: number;
  total_minutos: number;
  promedio_segundos: number;
}

interface Config {
  account_sid: string;
  api_key_sid: string;
  api_key_secret: string;
  twiml_app_sid: string;
}

interface UsoDatos {
  total_minutos: number;
  total_llamadas: number;
  costo_estimado: number;
  balance: { moneda: string; saldo: number } | null;
}

const BASE = '/api/custom-module5/llamada-sara';
const BASE_URL = 'https://workers.zeroazul.com';
const CALL_PATH = '/custom-module5/llamada-sara';

function formatDuracion(segundos: number | null): string {
  if (!segundos) return '-';
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return `${min}m ${sec}s`;
}

export default function LlamadaSara({ moduleData }: { moduleData?: any }) {
  const [tab, setTab] = useState<'asesor' | 'historial' | 'uso' | 'config' | 'docs'>('asesor');

  // Asesor
  const [asesorEstado, setAsesorEstado] = useState<'offline' | 'online' | 'ocupado'>('offline');
  const [asesorRoom, setAsesorRoom] = useState<string | null>(null);
  const [toggleando, setToggleando] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal llamada asesor
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<'conectando' | 'en-llamada' | 'finalizada' | 'error'>('conectando');
  const [modalMuted, setModalMuted] = useState(false);
  const [modalError, setModalError] = useState('');
  const modalDeviceRef = useRef<any>(null);
  const modalCallRef = useRef<any>(null);

  // Historial
  const [llamadas, setLlamadas] = useState<Llamada[]>([]);
  const [stats, setStats] = useState<Stats>({ total_llamadas: 0, total_minutos: 0, promedio_segundos: 0 });
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [filtroYear, setFiltroYear] = useState<string>(new Date().getFullYear().toString());
  const [filtroMonth, setFiltroMonth] = useState<string>('');
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);

  // Uso
  const [uso, setUso] = useState<UsoDatos | null>(null);
  const [loadingUso, setLoadingUso] = useState(false);
  const [usoTimestamp, setUsoTimestamp] = useState<string>('');

  // Config
  const [config, setConfig] = useState<Config>({ account_sid: '', api_key_sid: '', api_key_secret: '', twiml_app_sid: '' });
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [msgConfig, setMsgConfig] = useState('');

  // ---- Asesor ----
  const cargarEstadoAsesor = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/asesor/estado`);
      const data = await res.json();
      if (data.ok) {
        setAsesorEstado(data.estado);
        setAsesorRoom(data.room_activo || null);
      }
    } catch {}
  }, []);

  const toggleAsesor = async () => {
    setToggleando(true);
    const nuevoEstado = asesorEstado === 'offline' ? 'online' : 'offline';
    try {
      const res = await fetch(`${BASE}/asesor/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (data.ok) {
        setAsesorEstado(data.estado);
        setAsesorRoom(null);
      }
    } catch {}
    setToggleando(false);
  };

  const resetAsesor = async () => {
    setToggleando(true);
    try {
      const res = await fetch(`${BASE}/asesor/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'reset' }),
      });
      const data = await res.json();
      if (data.ok) {
        setAsesorEstado(data.estado);
        setAsesorRoom(null);
      }
    } catch {}
    setToggleando(false);
  };

  useEffect(() => {
    cargarEstadoAsesor();
  }, [cargarEstadoAsesor]);

  const abrirModalLlamada = useCallback(async (room: string) => {
    setModalOpen(true);
    setModalStatus('conectando');
    setModalMuted(false);
    setModalError('');

    try {
      const tokenRes = await fetch(`${BASE}/token?room=${encodeURIComponent(room)}&role=asesor`);
      const tokenData = await tokenRes.json();
      if (!tokenData.ok) throw new Error(tokenData.error || 'Error al obtener token');

      const { Device } = await import('@twilio/voice-sdk');
      const device = new Device(tokenData.token, { logLevel: 1 });
      modalDeviceRef.current = device;

      device.on('error', (twilioError: any) => {
        setModalError(twilioError?.message || 'Error de dispositivo');
        setModalStatus('error');
      });

      await device.register();

      const call = await device.connect({ params: { room } });
      modalCallRef.current = call;

      call.on('accept', () => setModalStatus('en-llamada'));
      call.on('disconnect', () => {
        setModalStatus('finalizada');
        modalCallRef.current = null;
        fetch(`${BASE}/finalizar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: room }),
        }).catch(() => {});
        cargarEstadoAsesor();
      });
      call.on('error', (err: any) => {
        setModalError(err?.message || 'Error en llamada');
        setModalStatus('error');
      });
    } catch (e: any) {
      setModalError(e.message || 'Error al conectar');
      setModalStatus('error');
    }
  }, [cargarEstadoAsesor]);

  const colgarModal = useCallback(() => {
    if (modalCallRef.current) {
      modalCallRef.current.disconnect();
      modalCallRef.current = null;
    }
    setModalStatus('finalizada');
    if (asesorRoom) {
      fetch(`${BASE}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: asesorRoom }),
      }).catch(() => {});
    }
    cargarEstadoAsesor();
  }, [asesorRoom, cargarEstadoAsesor]);

  const cerrarModal = useCallback(() => {
    if (modalCallRef.current) {
      modalCallRef.current.disconnect();
      modalCallRef.current = null;
    }
    if (modalDeviceRef.current) {
      modalDeviceRef.current.destroy();
      modalDeviceRef.current = null;
    }
    setModalOpen(false);
    setModalStatus('conectando');
    setModalMuted(false);
    setModalError('');
    cargarEstadoAsesor();
  }, [cargarEstadoAsesor]);

  const toggleMuteModal = useCallback(() => {
    if (!modalCallRef.current) return;
    const next = !modalMuted;
    modalCallRef.current.mute(next);
    setModalMuted(next);
  }, [modalMuted]);

  useEffect(() => {
    if (tab === 'asesor' && (asesorEstado === 'online' || asesorEstado === 'ocupado')) {
      pollingRef.current = setInterval(cargarEstadoAsesor, 3000);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [tab, asesorEstado, cargarEstadoAsesor]);

  // ---- Historial ----
  const cargarHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      let url = `${BASE}/llamadas?`;
      if (filtroYear) url += `year=${filtroYear}&`;
      if (filtroMonth) url += `month=${filtroMonth}&`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setLlamadas(data.llamadas);
        setStats(data.stats || { total_llamadas: 0, total_minutos: 0, promedio_segundos: 0 });
      }
    } catch {}
    setLoadingHistorial(false);
  }, [filtroYear, filtroMonth]);

  useEffect(() => {
    if (tab === 'historial') cargarHistorial();
  }, [tab, cargarHistorial]);

  const eliminarLlamada = async (room_id: string) => {
    await fetch(`${BASE}/llamadas/${room_id}`, { method: 'DELETE' });
    cargarHistorial();
  };

  // ---- Uso ----
  const cargarUso = useCallback(async () => {
    setLoadingUso(true);
    try {
      const res = await fetch(`${BASE}/uso`);
      const data = await res.json();
      if (data.ok) {
        setUso(data.uso);
        setUsoTimestamp(new Date().toLocaleTimeString('es-CO'));
      }
    } catch {}
    setLoadingUso(false);
  }, []);

  useEffect(() => {
    if (tab === 'uso') cargarUso();
  }, [tab, cargarUso]);

  // ---- Config ----
  const cargarConfig = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/config`);
      const data = await res.json();
      if (data.ok) setConfig(data.config);
    } catch {}
  }, []);

  useEffect(() => {
    cargarConfig();
  }, [cargarConfig]);

  const guardarConfig = async () => {
    setGuardandoConfig(true);
    setMsgConfig('');
    try {
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setMsgConfig(data.ok ? 'Guardado correctamente' : 'Error: ' + (data.error || ''));
    } catch (e: any) {
      setMsgConfig('Error: ' + e.message);
    }
    setGuardandoConfig(false);
  };

  const estadoColor = (estado: string) =>
    estado === 'activa' ? 'bg-green-100 text-green-700' :
    estado === 'finalizada' ? 'bg-gray-100 text-gray-600' :
    'bg-red-100 text-red-700';

  const tabs = [
    { id: 'asesor', label: 'Panel Asesor' },
    { id: 'historial', label: 'Historial' },
    { id: 'uso', label: 'Uso y Creditos' },
    { id: 'config', label: 'Credenciales' },
    { id: 'docs', label: 'Documentacion' },
  ] as const;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const months = [
    { value: '', label: 'Todos' },
    { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Panel Asesor */}
      {tab === 'asesor' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Panel Asesor</h2>

          <div className="flex items-center gap-4">
            <span className={`w-3 h-3 rounded-full ${
              asesorEstado === 'online' ? 'bg-green-500' :
              asesorEstado === 'ocupado' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <span className={`text-sm font-semibold ${
              asesorEstado === 'online' ? 'text-green-600' :
              asesorEstado === 'ocupado' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {asesorEstado === 'online' ? 'En linea' :
               asesorEstado === 'ocupado' ? 'En llamada' :
               'Desconectado'}
            </span>
            {asesorEstado !== 'ocupado' && (
              <button
                onClick={toggleAsesor}
                disabled={toggleando}
                className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                  asesorEstado === 'offline'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                }`}
              >
                {toggleando ? 'Cambiando...' : asesorEstado === 'offline' ? 'Conectarse' : 'Desconectarse'}
              </button>
            )}
            {asesorEstado === 'ocupado' && (
              <button
                onClick={resetAsesor}
                disabled={toggleando}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors disabled:opacity-50"
              >
                {toggleando ? 'Reseteando...' : 'Forzar reset'}
              </button>
            )}
          </div>

          {asesorEstado === 'online' && !asesorRoom && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-blue-500 rounded-full" />
              <span>Esperando llamadas entrantes...</span>
            </div>
          )}

          {asesorEstado === 'ocupado' && asesorRoom && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-800">Llamada entrante</p>
              <p className="text-xs text-blue-600 font-mono">{asesorRoom}</p>
              <button
                onClick={() => abrirModalLlamada(asesorRoom)}
                className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Atender llamada
              </button>
            </div>
          )}

          {asesorEstado === 'offline' && (
            <p className="text-sm text-gray-400">
              Conectate para recibir llamadas de clientes.
            </p>
          )}

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-1">Link publico para clientes</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value="https://bit.ly/promtadx"
                className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-700"
              />
              <button
                onClick={() => navigator.clipboard.writeText('https://bit.ly/promtadx')}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                Copiar
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 font-mono">{`${BASE_URL}${CALL_PATH}/llamar`}</p>
          </div>
        </div>
      )}

      {/* TAB: Historial */}
      {tab === 'historial' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ano</label>
                <select
                  value={filtroYear}
                  onChange={e => setFiltroYear(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mes</label>
                <select
                  value={filtroMonth}
                  onChange={e => setFiltroMonth(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <button
                onClick={cargarHistorial}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Filtrar
              </button>
            </div>
          </div>

          {/* Estadisticas */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total llamadas', value: stats.total_llamadas.toString() },
              { label: 'Total minutos', value: stats.total_minutos.toString() },
              { label: 'Promedio duracion', value: formatDuracion(stats.promedio_segundos) },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabla */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Historial de llamadas</h2>
              <button onClick={cargarHistorial} className="text-sm text-blue-500 hover:underline">Actualizar</button>
            </div>

            {loadingHistorial ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-t-transparent border-blue-500 rounded-full" />
              </div>
            ) : llamadas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin llamadas en este periodo</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">Cliente</th>
                      <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">Estado</th>
                      <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">Duracion</th>
                      <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">Fecha</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {llamadas.map(l => (
                      <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-4">
                          <span className="font-mono text-xs text-gray-700">{l.cliente_id || l.creado_por}</span>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${estadoColor(l.estado)}`}>
                            {l.estado}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-gray-600">
                          {formatDuracion(l.duracion_segundos)}
                        </td>
                        <td className="py-2 pr-4 text-xs text-gray-500">
                          {new Date(l.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {l.recording_url && (
                              <button
                                onClick={() => setAudioPlaying(audioPlaying === l.room_id ? null : l.room_id)}
                                className="text-xs text-blue-500 hover:underline"
                              >
                                {audioPlaying === l.room_id ? 'Cerrar audio' : 'Reproducir'}
                              </button>
                            )}
                            <button
                              onClick={() => eliminarLlamada(l.room_id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Eliminar
                            </button>
                          </div>
                          {audioPlaying === l.room_id && l.recording_url && (
                            <div className="mt-2">
                              <audio controls src={`${BASE}/recording?url=${encodeURIComponent(l.recording_url)}`} className="w-full h-8" />
                            </div>
                          )}
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

      {/* TAB: Uso y Creditos */}
      {tab === 'uso' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Uso y Creditos</h2>
              <div className="flex items-center gap-3">
                {usoTimestamp && <span className="text-xs text-gray-400">Actualizado: {usoTimestamp}</span>}
                <button onClick={cargarUso} className="text-sm text-blue-500 hover:underline">Actualizar</button>
              </div>
            </div>

            {loadingUso ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-t-transparent border-blue-500 rounded-full" />
              </div>
            ) : !uso ? (
              <p className="text-sm text-gray-400 text-center py-8">No se pudieron cargar los datos</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uso.balance && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">${(uso.balance.saldo * 3).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Balance ({uso.balance.moneda})</p>
                  </div>
                )}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{uso.total_minutos}</p>
                  <p className="text-xs text-gray-500 mt-1">Minutos este mes</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{uso.total_llamadas}</p>
                  <p className="text-xs text-gray-500 mt-1">Llamadas este mes</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">${(uso.costo_estimado * 3).toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">Costo estimado</p>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">Tarifa Zero Azul Promta Dx 3x</p>
          </div>
        </div>
      )}

      {/* TAB: Credenciales */}
      {tab === 'config' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Credenciales Twilio</h2>
          <div className="grid grid-cols-1 gap-4">
            {[
              { key: 'account_sid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
              { key: 'api_key_sid', label: 'API Key SID', placeholder: 'SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
              { key: 'api_key_secret', label: 'API Key Secret', placeholder: '' },
              { key: 'twiml_app_sid', label: 'TwiML App SID', placeholder: 'APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  type={key === 'api_key_secret' ? 'password' : 'text'}
                  value={(config as any)[key]}
                  onChange={e => setConfig({ ...config, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={guardarConfig}
              disabled={guardandoConfig}
              className="px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {guardandoConfig ? 'Guardando...' : 'Guardar'}
            </button>
            {msgConfig && (
              <span className={`text-sm ${msgConfig.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {msgConfig}
              </span>
            )}
          </div>
        </div>
      )}

      {/* TAB: Documentacion */}
      {tab === 'docs' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Documentacion</h2>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Flujo de una llamada</p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>El cliente abre el link publico de llamada</li>
              <li>Si el asesor esta en linea, se crea una sala automaticamente</li>
              <li>Si el asesor esta ocupado, el cliente espera hasta que se libere</li>
              <li>Si el asesor esta desconectado, se muestra un mensaje al cliente</li>
              <li>El asesor ve la llamada entrante en su panel y la atiende</li>
              <li>Ambos se conectan a la misma conferencia de voz via Twilio</li>
              <li>Al finalizar, se registra la duracion y el asesor queda disponible</li>
            </ol>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Link publico para clientes</p>
            <code className="block bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-3 font-mono break-all">
              {`${BASE_URL}${CALL_PATH}/llamar`}
            </code>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Configuracion requerida en Twilio Dashboard</p>
            <p className="text-sm text-gray-600 mb-2">
              La <strong>TwiML App</strong> cuyo SID esta en Credenciales debe tener configurada la siguiente Voice URL:
            </p>
            <code className="block bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-3 font-mono break-all">
              {`${BASE_URL}/api/custom-module5/llamada-sara/twiml`}
            </code>
            <p className="text-xs text-gray-400 mt-1">Method: POST</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Endpoints de la API</p>
            <div className="space-y-2 text-xs font-mono">
              {[
                { method: 'GET', path: '/api/custom-module5/llamada-sara/asesor/estado', desc: 'Estado actual del asesor' },
                { method: 'POST', path: '/api/custom-module5/llamada-sara/asesor/estado', desc: 'Toggle online/offline' },
                { method: 'POST', path: '/api/custom-module5/llamada-sara/cliente/solicitar', desc: 'Cliente solicita llamada' },
                { method: 'POST', path: '/api/custom-module5/llamada-sara/finalizar', desc: 'Finaliza llamada y calcula duracion' },
                { method: 'GET', path: '/api/custom-module5/llamada-sara/llamadas', desc: 'Lista llamadas con filtros (?year=&month=)' },
                { method: 'DELETE', path: '/api/custom-module5/llamada-sara/llamadas/[room]', desc: 'Elimina una llamada' },
                { method: 'GET', path: '/api/custom-module5/llamada-sara/token?room=X&role=Y', desc: 'Twilio Access Token' },
                { method: 'POST', path: '/api/custom-module5/llamada-sara/twiml', desc: 'Webhook TwiML para Twilio' },
                { method: 'GET', path: '/api/custom-module5/llamada-sara/uso', desc: 'Uso y creditos de Twilio' },
                { method: 'GET/PUT', path: '/api/custom-module5/llamada-sara/config', desc: 'Credenciales Twilio' },
                { method: 'POST', path: '/api/custom-module5/llamada-sara/recording-callback', desc: 'Callback de grabacion Twilio' },
              ].map(({ method, path, desc }) => (
                <div key={path + method} className="flex gap-3 items-start">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-white text-xs font-bold ${
                    method === 'GET' ? 'bg-blue-500' : method === 'POST' ? 'bg-green-500' : method === 'DELETE' ? 'bg-red-500' : 'bg-yellow-500 text-gray-900'
                  }`}>{method}</span>
                  <span className="text-gray-700">{path}</span>
                  <span className="text-gray-400 hidden md:inline">-- {desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Tablas en la base de datos</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">{`modulos_sara_11_config     -- Credenciales Twilio + config grabacion
modulos_sara_11_llamadas   -- Registro de llamadas (room_id, estado, duracion, recording_url)
modulos_sara_11_asesores   -- Estado del asesor (online/offline/ocupado)`}</pre>
          </div>
        </div>
      )}

      {/* Modal llamada asesor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-8 text-center space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Llamada activa</h2>
              {asesorRoom && (
                <p className="text-xs text-gray-400 font-mono mt-1 break-all">{asesorRoom}</p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                modalStatus === 'en-llamada' ? 'bg-green-500' :
                modalStatus === 'conectando' ? 'bg-yellow-500 animate-pulse' :
                modalStatus === 'error' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
              <span className={`text-sm font-semibold ${
                modalStatus === 'en-llamada' ? 'text-green-600' :
                modalStatus === 'conectando' ? 'text-yellow-600' :
                modalStatus === 'error' ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {modalStatus === 'conectando' ? 'Conectando...' :
                 modalStatus === 'en-llamada' ? 'En llamada' :
                 modalStatus === 'finalizada' ? 'Llamada finalizada' :
                 'Error'}
              </span>
            </div>

            {modalStatus === 'error' && modalError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {modalError}
              </div>
            )}

            {modalStatus === 'conectando' && (
              <div className="flex items-center justify-center gap-2 py-2 text-gray-500">
                <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-blue-500 rounded-full" />
                <span className="text-sm">Conectando...</span>
              </div>
            )}

            {modalStatus === 'en-llamada' && (
              <div className="flex gap-3">
                <button
                  onClick={toggleMuteModal}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                    modalMuted ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {modalMuted ? 'Silenciado' : 'Silenciar'}
                </button>
                <button
                  onClick={colgarModal}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Colgar
                </button>
              </div>
            )}

            {(modalStatus === 'finalizada' || modalStatus === 'error') && (
              <button
                onClick={cerrarModal}
                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

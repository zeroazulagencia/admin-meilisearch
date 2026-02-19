'use client';

import { useState, useEffect, useCallback } from 'react';

interface Llamada {
  id: number;
  room_id: string;
  estado: 'activa' | 'finalizada' | 'cancelada';
  creado_por: string;
  created_at: string;
}

interface Config {
  account_sid: string;
  api_key_sid: string;
  api_key_secret: string;
  twiml_app_sid: string;
}

const BASE = '/api/custom-module5/llamada-sara';
const BASE_URL = 'https://workers.zeroazul.com';
const CALL_PATH = '/custom-module5/llamada-sara';

export default function LlamadaSara({ moduleData }: { moduleData?: any }) {
  const [tab, setTab] = useState<'crear' | 'historial' | 'config' | 'docs'>('crear');

  // Crear
  const [creando, setCreando] = useState(false);
  const [linkGenerado, setLinkGenerado] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Historial
  const [llamadas, setLlamadas] = useState<Llamada[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Config
  const [config, setConfig] = useState<Config>({ account_sid: '', api_key_sid: '', api_key_secret: '', twiml_app_sid: '' });
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [msgConfig, setMsgConfig] = useState('');

  const cargarHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const res = await fetch(`${BASE}/llamadas`);
      const data = await res.json();
      if (data.ok) setLlamadas(data.llamadas);
    } catch {}
    setLoadingHistorial(false);
  }, []);

  const cargarConfig = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/config`);
      const data = await res.json();
      if (data.ok) setConfig(data.config);
    } catch {}
  }, []);

  useEffect(() => {
    cargarHistorial();
    cargarConfig();
  }, [cargarHistorial, cargarConfig]);

  const crearLlamada = async () => {
    setCreando(true);
    setLinkGenerado('');
    try {
      const res = await fetch(`${BASE}/crear`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setLinkGenerado(data.link);
        cargarHistorial();
      }
    } catch {}
    setCreando(false);
  };

  const copiarLink = () => {
    navigator.clipboard.writeText(linkGenerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const eliminarLlamada = async (room_id: string) => {
    await fetch(`${BASE}/llamadas/${room_id}`, { method: 'DELETE' });
    cargarHistorial();
  };

  const cambiarEstado = async (room_id: string, estado: string) => {
    await fetch(`${BASE}/llamadas/${room_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    cargarHistorial();
  };

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

  const tabs = [
    { id: 'crear', label: 'Crear llamada' },
    { id: 'historial', label: 'Historial' },
    { id: 'config', label: 'Credenciales' },
    { id: 'docs', label: 'Documentación' },
  ] as const;

  const estadoColor = (estado: string) =>
    estado === 'activa' ? 'bg-green-100 text-green-700' :
    estado === 'finalizada' ? 'bg-gray-100 text-gray-600' :
    'bg-red-100 text-red-700';

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

      {/* TAB: Crear */}
      {tab === 'crear' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Nueva llamada</h2>
          <p className="text-sm text-gray-500">
            Genera una sala de conferencia de voz. Comparte el enlace con el cliente para que se una.
          </p>
          <button
            onClick={crearLlamada}
            disabled={creando}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {creando ? 'Creando...' : '📞 Crear llamada'}
          </button>

          {linkGenerado && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-green-800">✅ Llamada creada</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={linkGenerado}
                  className="flex-1 text-xs font-mono bg-white border border-green-300 rounded px-3 py-2 text-gray-700"
                />
                <button
                  onClick={copiarLink}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {copiado ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <a
                href={linkGenerado}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-green-700 underline"
              >
                Abrir enlace →
              </a>
            </div>
          )}
        </div>
      )}

      {/* TAB: Historial */}
      {tab === 'historial' && (
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
            <p className="text-sm text-gray-400 text-center py-8">Sin llamadas aún</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Room ID</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Estado</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Fecha</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {llamadas.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-4">
                        <span className="font-mono text-xs text-gray-700">{l.room_id}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${estadoColor(l.estado)}`}>
                          {l.estado}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-500">
                        {new Date(l.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <a
                            href={`${BASE_URL}${CALL_PATH}/${l.room_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            Abrir
                          </a>
                          {l.estado === 'activa' && (
                            <button
                              onClick={() => cambiarEstado(l.room_id, 'finalizada')}
                              className="text-xs text-yellow-600 hover:underline"
                            >
                              Finalizar
                            </button>
                          )}
                          <button
                            onClick={() => eliminarLlamada(l.room_id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
              { key: 'api_key_secret', label: 'API Key Secret', placeholder: '••••••••••••••••••••••••••••••••' },
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

      {/* TAB: Documentación */}
      {tab === 'docs' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Documentación</h2>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Flujo de una llamada</p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Admin crea una llamada → se genera un <code className="bg-gray-100 px-1 rounded">room_id</code> y un enlace</li>
              <li>Admin y cliente abren el enlace en su navegador</li>
              <li>La página obtiene un <strong>Twilio Access Token</strong> del servidor</li>
              <li>Twilio Device se conecta → Twilio llama al webhook TwiML</li>
              <li>Ambos entran a la misma conferencia de voz</li>
            </ol>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">⚠️ Configuración requerida en Twilio Dashboard</p>
            <p className="text-sm text-gray-600 mb-2">
              La <strong>TwiML App</strong> cuyo SID está en Credenciales debe tener configurada la siguiente Voice URL:
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
                { method: 'POST', path: '/api/custom-module5/llamada-sara/crear', desc: 'Crea nueva sala → retorna room_id y link' },
                { method: 'GET', path: '/api/custom-module5/llamada-sara/llamadas', desc: 'Lista todas las llamadas' },
                { method: 'PATCH', path: '/api/custom-module5/llamada-sara/llamadas/[room]', desc: 'Actualiza estado (activa|finalizada|cancelada)' },
                { method: 'DELETE', path: '/api/custom-module5/llamada-sara/llamadas/[room]', desc: 'Elimina una llamada' },
                { method: 'GET', path: '/api/custom-module5/llamada-sara/token?room=X', desc: 'Retorna Twilio Access Token (público)' },
                { method: 'POST', path: '/api/custom-module5/llamada-sara/twiml', desc: 'Webhook TwiML para Twilio (público)' },
                { method: 'GET/PUT', path: '/api/custom-module5/llamada-sara/config', desc: 'Lee/actualiza credenciales Twilio' },
              ].map(({ method, path, desc }) => (
                <div key={path} className="flex gap-3 items-start">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-white text-xs font-bold ${
                    method === 'GET' ? 'bg-blue-500' : method === 'POST' ? 'bg-green-500' : method === 'DELETE' ? 'bg-red-500' : 'bg-yellow-500 text-gray-900'
                  }`}>{method}</span>
                  <span className="text-gray-700">{path}</span>
                  <span className="text-gray-400 hidden md:inline">— {desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Tablas en la base de datos</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">{`modulos_sara_11_config     -- Credenciales Twilio (account_sid, api_key_sid, api_key_secret, twiml_app_sid)
modulos_sara_11_llamadas   -- Registro de salas (room_id, estado, creado_por, timestamps)`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}


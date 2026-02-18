'use client';

import { useState, useEffect, useCallback } from 'react';

interface Carta {
  id: number;
  empleado_nombre: string;
  empleado_cedula: string;
  empleado_cargo: string;
  empleado_salario: number;
  estado: string;
  solicitado_via: string;
  created_at: string;
  pdf_token: string | null;
  pdf_token_expires_at: string | null;
}

interface Config {
  empresa_nombre: string;
  empresa_nit: string;
  empresa_direccion: string;
  empresa_ciudad: string;
  firma_nombre: string;
  firma_cargo: string;
  firma_imagen_url: string;
  logo_path: string;
  sigha_login_url: string;
  sigha_empleados_url: string;
  sigha_email: string;
  sigha_clave: string;
  sigha_nit_cliente: string;
}

const BASE = '/api/modulos/carta-laboral';

function tokenExpirado(expires: string | null): boolean {
  if (!expires) return true;
  return new Date(expires) < new Date();
}

export default function GeneradorCartaLaboral({ moduleData }: { moduleData?: any }) {
  const [nit, setNit] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');
  const [historial, setHistorial] = useState<Carta[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tab, setTab] = useState<'generar' | 'historial' | 'config' | 'docs'>('generar');
  const [config, setConfig] = useState<Config | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configGuardado, setConfigGuardado] = useState('');

  const cargarConfig = useCallback(async () => {
    const res = await fetch(`${BASE}/config`);
    const data = await res.json();
    if (data.ok) {
      setApiKey(data.api_key || '');
      setConfig(data.config);
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const res = await fetch(`${BASE}/historial`);
      const data = await res.json();
      if (data.ok) setHistorial(data.cartas);
    } catch {}
    setLoadingHistorial(false);
  }, []);

  useEffect(() => {
    cargarConfig();
    cargarHistorial();
  }, [cargarConfig, cargarHistorial]);

  const generar = async () => {
    if (!nit.trim()) return;
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const res = await fetch(`${BASE}/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ nit: nit.trim() }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setResultado(data);
        cargarHistorial();
      } else {
        setError(data.message || 'Error al generar la carta');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const guardarConfig = async () => {
    if (!config) return;
    setConfigLoading(true);
    setConfigGuardado('');
    try {
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.ok) {
        setConfigGuardado('Configuracion guardada correctamente');
        await cargarConfig();
      } else {
        setConfigGuardado('Error: ' + (data.error || 'No se pudo guardar'));
      }
    } catch (e: any) {
      setConfigGuardado('Error: ' + e.message);
    }
    setConfigLoading(false);
  };

  const tabs = [
    { id: 'generar', label: 'Generar' },
    { id: 'historial', label: 'Historial' },
    { id: 'config', label: 'Credenciales' },
    { id: 'docs', label: 'Documentacion' },
  ] as const;

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Generar */}
      {tab === 'generar' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generar carta laboral</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={nit}
              onChange={e => setNit(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generar()}
              placeholder="Numero de cedula del empleado"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={generar}
              disabled={loading || !nit.trim()}
              className="px-5 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Generando...' : 'Generar'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {resultado && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-green-800">Carta generada correctamente</p>
              <p className="text-sm text-green-700">
                {resultado.nombre_completo} &mdash; CC {resultado.nit_consultado}
              </p>
              {resultado.mail && (
                <p className="text-xs text-green-600">{resultado.mail}</p>
              )}
              <p className="text-xs text-green-600">
                El enlace es valido por 48 horas desde este momento
              </p>
              <a
                href={resultado.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Ver PDF
              </a>
            </div>
          )}
        </div>
      )}

      {/* TAB: Historial */}
      {tab === 'historial' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Historial de cartas</h2>
            <button onClick={cargarHistorial} className="text-sm text-blue-500 hover:underline">
              Actualizar
            </button>
          </div>

          {loadingHistorial ? (
            <div className="text-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-t-transparent border-blue-500 rounded-full mx-auto" />
            </div>
          ) : historial.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin registros aun</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Nombre</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Cedula</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Cargo</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Estado</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Fecha</th>
                    <th className="text-left py-2 text-gray-500 font-medium">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(c => {
                    const expirado = tokenExpirado(c.pdf_token_expires_at);
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-4 text-gray-900 font-medium">{c.empleado_nombre}</td>
                        <td className="py-2 pr-4 text-gray-600">{c.empleado_cedula}</td>
                        <td className="py-2 pr-4 text-gray-600">{c.empleado_cargo}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            c.estado === 'generada' ? 'bg-green-100 text-green-700' :
                            c.estado === 'error'    ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {c.estado}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-500 text-xs">
                          {new Date(c.created_at).toLocaleDateString('es-CO')}
                        </td>
                        <td className="py-2">
                          {c.pdf_token && !expirado ? (
                            <a
                              href={`${BASE}/pdf?token=${c.pdf_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline text-xs"
                            >
                              Ver PDF
                            </a>
                          ) : c.pdf_token && expirado ? (
                            <span className="text-gray-400 text-xs">Expirado</span>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Credenciales */}
      {tab === 'config' && config && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Credenciales y configuracion</h2>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Empresa</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'empresa_nombre', label: 'Nombre de la empresa' },
                { key: 'empresa_nit', label: 'NIT empresa' },
                { key: 'empresa_ciudad', label: 'Ciudad' },
                { key: 'empresa_direccion', label: 'Direccion' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type="text"
                    value={(config as any)[key]}
                    onChange={e => setConfig({ ...config, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Firmante</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'firma_nombre', label: 'Nombre completo' },
                { key: 'firma_cargo', label: 'Cargo' },
                { key: 'firma_imagen_url', label: 'URL imagen firma' },
                { key: 'logo_path', label: 'Ruta logo (public-img/)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type="text"
                    value={(config as any)[key]}
                    onChange={e => setConfig({ ...config, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">API Sigha</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'sigha_email', label: 'Email' },
                { key: 'sigha_clave', label: 'Clave', type: 'password' },
                { key: 'sigha_nit_cliente', label: 'NIT cliente' },
                { key: 'sigha_login_url', label: 'URL login' },
                { key: 'sigha_empleados_url', label: 'URL empleados' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type={type || 'text'}
                    value={(config as any)[key]}
                    onChange={e => setConfig({ ...config, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={guardarConfig}
              disabled={configLoading}
              className="px-5 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {configLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {configGuardado && (
              <span className={`text-sm ${configGuardado.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {configGuardado}
              </span>
            )}
          </div>
        </div>
      )}

      {/* TAB: Documentacion */}
      {tab === 'docs' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Documentacion de la API</h2>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Autenticacion</p>
            <p className="text-sm text-gray-500 mb-3">
              El endpoint de generacion requiere el header <code className="bg-gray-100 px-1 rounded">x-api-key</code> con la API key del modulo.
              La key actual es:
            </p>
            <code className="block bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-3 font-mono break-all">
              {apiKey || 'Cargando...'}
            </code>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              POST /api/modulos/carta-laboral/generar
            </p>
            <p className="text-sm text-gray-500 mb-2">
              Genera una carta laboral para el empleado con la cedula indicada. Retorna la URL temporal del PDF (valida 48 horas).
            </p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">
{`curl -X POST https://workers.zeroazul.com/api/modulos/carta-laboral/generar \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || 'TU_API_KEY'}" \\
  -d '{"nit": "71317374"}'`}
            </pre>
            <p className="text-xs text-gray-400 mt-2">Respuesta exitosa:</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">
{`{
  "status": "ok",
  "nombre_completo": "JUAN DAVID BALLESTEROS TORRES",
  "nit_consultado": "71317374",
  "mail": "jballesteros@empresa.com",
  "pdf_url": "https://workers.zeroazul.com/api/modulos/carta-laboral/pdf?token=abc123...",
  "pdf_token": "abc123...",
  "pdf_token_expires_at": "2025-01-20 14:30:00"
}`}
            </pre>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              GET /api/modulos/carta-laboral/pdf?token=TOKEN
            </p>
            <p className="text-sm text-gray-500 mb-2">
              Sirve el PDF de la carta especifica vinculada al token. El token expira en 48 horas desde la generacion. Cada generacion produce un token distinto que apunta a ese archivo especifico.
            </p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">
{`curl -o carta.pdf \\
  "https://workers.zeroazul.com/api/modulos/carta-laboral/pdf?token=abc123..."`}
            </pre>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              GET /api/modulos/carta-laboral/historial
            </p>
            <p className="text-sm text-gray-500 mb-2">
              Lista el historial de cartas generadas con paginacion.
            </p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">
{`curl "https://workers.zeroazul.com/api/modulos/carta-laboral/historial?page=1&limit=20"`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

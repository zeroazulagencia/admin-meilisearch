'use client';

import { useState } from 'react';

const TOKEN = '723462523478hjkweghk892874771234';
const BASE = '/api/custom-module4/consulta-de-cumplea-os';
const BASE_URL = 'https://workers.zeroazul.com';

const MESES = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export default function ConsultaDeCumpleanos({ moduleData }: { moduleData?: any }) {
  const mesActual = String(new Date().getMonth() + 1).padStart(2, '0');
  const [tab, setTab] = useState<'prueba' | 'docs'>('prueba');
  const [mes, setMes] = useState(mesActual);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');

  const consultar = async () => {
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const res = await fetch(`${BASE}?token=${TOKEN}&mes=${mes}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al consultar');
      } else {
        setResultado(data);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'prueba', label: 'Prueba' },
    { id: 'docs',  label: 'Documentacion' },
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

      {/* TAB: Prueba */}
      {tab === 'prueba' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Probar endpoint</h2>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Mes a consultar</label>
              <select
                value={mes}
                onChange={e => setMes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MESES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={consultar}
              disabled={loading}
              className="px-5 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Consultando...' : 'Consultar'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {resultado && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                  {resultado.cantidad_registros} registros
                </span>
                <span className="text-xs text-gray-400">
                  {MESES.find(m => m.value === mes)?.label}
                </span>
              </div>
              <pre className="bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB: Documentacion */}
      {tab === 'docs' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Documentacion de la API</h2>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Autenticacion</p>
            <p className="text-sm text-gray-500 mb-3">
              Todas las solicitudes deben incluir el parametro <code className="bg-gray-100 px-1 rounded">token</code> en la query string.
            </p>
            <code className="block bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-3 font-mono break-all">
              {TOKEN}
            </code>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              GET /api/custom-module4/consulta-de-cumplea-os
            </p>
            <p className="text-sm text-gray-500 mb-3">
              Retorna los cumpleanos del mes indicado. Si no se pasa <code className="bg-gray-100 px-1 rounded">mes</code>, usa el mes actual (zona horaria America/Bogota).
            </p>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Parametros</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Parametro</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Tipo</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Requerido</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Descripcion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-2 font-mono text-xs text-blue-600">token</td>
                    <td className="px-4 py-2 text-xs text-gray-600">string</td>
                    <td className="px-4 py-2 text-xs text-red-500">Si</td>
                    <td className="px-4 py-2 text-xs text-gray-600">Token de acceso al endpoint</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-xs text-blue-600">mes</td>
                    <td className="px-4 py-2 text-xs text-gray-600">string (01-12)</td>
                    <td className="px-4 py-2 text-xs text-gray-400">No</td>
                    <td className="px-4 py-2 text-xs text-gray-600">Mes en formato de 2 digitos. Por defecto: mes actual</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ejemplo de solicitud</p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre mb-4">
{`# Mes actual
curl "${BASE_URL}${BASE}?token=${TOKEN}"

# Mes especifico (ej: marzo)
curl "${BASE_URL}${BASE}?token=${TOKEN}&mes=03"`}
            </pre>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Respuesta exitosa (200)</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre mb-4">
{`{
  "cantidad_registros": 3,
  "empleados": [
    {
      "42": {
        "datos_personales": {
          "nombre_completo": "Maria Lopez",
          "fecha_nacimiento": "1990-03-15"
        },
        "contratos": []
      },
      "87": {
        "datos_personales": {
          "nombre_completo": "Carlos Perez",
          "fecha_nacimiento": "1985-03-22"
        },
        "contratos": []
      }
    }
  ]
}`}
            </pre>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Respuestas de error</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Codigo</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Mensaje</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Causa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-2 text-xs text-red-600 font-mono">403</td>
                    <td className="px-4 py-2 text-xs text-gray-600">Token requerido o inválido</td>
                    <td className="px-4 py-2 text-xs text-gray-500">No se envio token o es incorrecto</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-xs text-red-600 font-mono">500</td>
                    <td className="px-4 py-2 text-xs text-gray-600">Error obteniendo la información de cumpleaños</td>
                    <td className="px-4 py-2 text-xs text-gray-500">Fallo al conectar con tarjetav.co</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className="border-gray-200" />

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Estructura de archivos del modulo</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">
{`admin-meilisearch/
|
|-- modules-custom/consulta-de-cumplea-os/
|   +-- index.tsx            # UI del modulo (tabs Prueba / Documentacion)
|
+-- app/api/custom-module4/consulta-de-cumplea-os/
    +-- route.ts             # GET ?token=TOKEN&mes=MM -> proxy a tarjetav.co`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}


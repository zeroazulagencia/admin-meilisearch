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
}

const BASE = '/api/module-api/3';

export default function GeneradorCartaLaboral({ moduleData }: { moduleData?: any }) {
  const [nit, setNit] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');
  const [historial, setHistorial] = useState<Carta[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const cargarHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const res = await fetch(`${BASE}/historial`);
      const data = await res.json();
      if (data.ok) setHistorial(data.cartas);
    } catch {}
    setLoadingHistorial(false);
  }, []);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  const generar = async () => {
    if (!nit.trim()) return;
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const res = await fetch(`${BASE}/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* Generador */}
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
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-800 mb-1">Carta generada correctamente</p>
            <p className="text-sm text-green-700 mb-3">
              {resultado.nombre_completo} — {resultado.nit_consultado}
            </p>
            <a
              href={resultado.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Ver PDF
            </a>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Historial de cartas</h2>
          <button
            onClick={cargarHistorial}
            className="text-sm text-blue-500 hover:underline"
          >
            Actualizar
          </button>
        </div>

        {loadingHistorial ? (
          <div className="text-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-t-transparent border-blue-500 rounded-full mx-auto"></div>
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
                {historial.map(c => (
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
                      <a
                        href={`${BASE}/pdf?nit=${c.empleado_cedula}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-xs"
                      >
                        Ver PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

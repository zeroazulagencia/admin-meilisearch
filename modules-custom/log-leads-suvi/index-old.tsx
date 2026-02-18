'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Lead {
  id: number;
  leadgen_id: string;
  campaign_name: string;
  ad_name: string;
  campaign_type: string;
  processing_status: string;
  current_step: string;
  error_message: string;
  salesforce_account_name: string;
  salesforce_opportunity_id: string;
  received_at: string;
  completed_at: string;
  processing_time_seconds: number;
}

interface Stats {
  total: number;
  completados: number;
  errores: number;
  en_proceso: number;
  avg_time: number;
}

interface SalesforceStatus {
  oauth_configured: boolean;
  has_active_tokens: boolean;
  instance_url: string | null;
  is_expired: boolean;
  time_until_expiry_minutes: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  'recibido': 'bg-blue-100 text-blue-800',
  'consultando_facebook': 'bg-purple-100 text-purple-800',
  'limpiando_datos': 'bg-indigo-100 text-indigo-800',
  'enriqueciendo_ia': 'bg-cyan-100 text-cyan-800',
  'clasificando': 'bg-teal-100 text-teal-800',
  'creando_cuenta': 'bg-orange-100 text-orange-800',
  'creando_oportunidad': 'bg-amber-100 text-amber-800',
  'completado': 'bg-green-100 text-green-800',
  'error': 'bg-red-100 text-red-800'
};

const STATUS_ICONS: Record<string, string> = {
  'recibido': '📨',
  'consultando_facebook': '🔍',
  'limpiando_datos': '🧹',
  'enriqueciendo_ia': '🤖',
  'clasificando': '🏷️',
  'creando_cuenta': '👤',
  'creando_oportunidad': '💼',
  'completado': '✅',
  'error': '❌'
};

export default function LogLeadsSUVI() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [salesforceStatus, setSalesforceStatus] = useState<SalesforceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    campaign_type: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  
  const oauthSuccess = searchParams.get('oauth_success');
  const oauthError = searchParams.get('oauth_error');

  useEffect(() => {
    loadLeads();
    loadSalesforceStatus();
  }, [page, filters]);

  // Recargar estado de Salesforce cuando se conecta exitosamente
  useEffect(() => {
    if (oauthSuccess) {
      setTimeout(() => {
        loadSalesforceStatus();
      }, 1000);
    }
  }, [oauthSuccess]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.campaign_type && { campaign_type: filters.campaign_type }),
        ...(filters.search && { search: filters.search })
      });

      const res = await fetch(`/api/custom-module1/log-leads-suvi?${params}`);
      const data = await res.json();

      if (data.ok) {
        setLeads(data.leads);
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Error cargando leads:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesforceStatus = async () => {
    try {
      const res = await fetch('/api/oauth/salesforce/status');
      const data = await res.json();
      setSalesforceStatus(data);
    } catch (e) {
      console.error('Error cargando estado Salesforce:', e);
    }
  };

  const connectSalesforce = () => {
    window.location.href = '/api/oauth/salesforce/authorize';
  };

  const viewDetail = async (leadId: number) => {
    try {
      const res = await fetch(`/api/custom-module1/log-leads-suvi/${leadId}`);
      const data = await res.json();
      if (data.ok) {
        setSelectedLead(data.lead);
        setShowDetail(true);
      }
    } catch (e) {
      console.error('Error cargando detalle:', e);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">📋 Log Leads SUVI</h1>
        <p className="text-purple-100">Monitoreo en tiempo real del proceso Facebook → IA → Salesforce</p>
      </div>

      {/* Mensajes de OAuth */}
      {oauthSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <p className="font-bold text-green-900">¡Salesforce conectado exitosamente!</p>
              <p className="text-green-700 text-sm">Los leads se procesarán automáticamente</p>
            </div>
          </div>
        </div>
      )}

      {oauthError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❌</span>
            <div>
              <p className="font-bold text-red-900">Error al conectar con Salesforce</p>
              <p className="text-red-700 text-sm">{decodeURIComponent(oauthError)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Estado de Salesforce */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
              🔐
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Conexión con Salesforce</h3>
              {salesforceStatus ? (
                <div className="flex items-center gap-2 mt-1">
                  {salesforceStatus.has_active_tokens ? (
                    <>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        ✅ Conectado
                      </span>
                      {salesforceStatus.time_until_expiry_minutes !== null && (
                        <span className="text-xs text-gray-500">
                          Token válido por {salesforceStatus.time_until_expiry_minutes} min
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⚠️ No conectado
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1">Verificando...</p>
              )}
            </div>
          </div>
          
          {salesforceStatus && !salesforceStatus.has_active_tokens && (
            <button
              onClick={connectSalesforce}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🚀 Conectar Salesforce
            </button>
          )}
          
          {salesforceStatus?.has_active_tokens && (
            <button
              onClick={loadSalesforceStatus}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              🔄 Verificar
            </button>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Completados</p>
            <p className="text-2xl font-bold text-green-600">{stats.completados}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">En Proceso</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.en_proceso}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Errores</p>
            <p className="text-2xl font-bold text-red-600">{stats.errores}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Tiempo Prom.</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatTime(Math.round(stats.avg_time || 0))}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="🔍 Buscar por ID, campaña, cuenta..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos los estados</option>
            <option value="recibido">Recibido</option>
            <option value="enriqueciendo_ia">Enriqueciendo IA</option>
            <option value="creando_oportunidad">Creando Oportunidad</option>
            <option value="completado">Completado</option>
            <option value="error">Error</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            value={filters.campaign_type}
            onChange={(e) => setFilters({ ...filters, campaign_type: e.target.value })}
          >
            <option value="">Todos los tipos</option>
            <option value="Pauta Interna">Pauta Interna</option>
            <option value="Pauta Agencia">Pauta Agencia</option>
          </select>
          <button
            onClick={loadLeads}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Tabla de Leads */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay leads registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Facebook</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaña</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta SF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recibido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {lead.leadgen_id.substring(0, 15)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {lead.campaign_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.campaign_type ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          lead.campaign_type === 'Pauta Interna' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {lead.campaign_type}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[lead.processing_status]}`}>
                        {STATUS_ICONS[lead.processing_status]} {lead.processing_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {lead.salesforce_account_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(lead.received_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatTime(lead.processing_time_seconds)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => viewDetail(lead.id)}
                        className="text-purple-600 hover:text-purple-900 font-medium"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {showDetail && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-purple-600 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Detalle del Lead</h2>
                  <p className="text-purple-200 font-mono text-sm">{selectedLead.leadgen_id}</p>
                </div>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-white hover:bg-purple-700 p-2 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Estado actual */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Estado Actual</h3>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[selectedLead.processing_status]}`}>
                    {STATUS_ICONS[selectedLead.processing_status]} {selectedLead.processing_status}
                  </span>
                  <span className="text-gray-600 text-sm">{selectedLead.current_step}</span>
                </div>
                {selectedLead.error_message && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-red-800 text-sm">❌ {selectedLead.error_message}</p>
                  </div>
                )}
              </div>

              {/* Info de campaña */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Información de Campaña</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Campaña</dt>
                    <dd className="text-gray-900 font-medium">{selectedLead.campaign_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Anuncio</dt>
                    <dd className="text-gray-900 font-medium">{selectedLead.ad_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Tipo de Pauta</dt>
                    <dd className="text-gray-900 font-medium">{selectedLead.campaign_type || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* Info de Salesforce */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Salesforce</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Cuenta</dt>
                    <dd className="text-gray-900 font-medium">{selectedLead.salesforce_account_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">ID Oportunidad</dt>
                    <dd className="text-gray-900 font-mono text-xs">{selectedLead.salesforce_opportunity_id || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* Tiempos */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tiempos de Procesamiento</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Recibido</dt>
                    <dd className="text-gray-900">{formatDate(selectedLead.received_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Completado</dt>
                    <dd className="text-gray-900">{formatDate(selectedLead.completed_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Tiempo Total</dt>
                    <dd className="text-gray-900 font-medium">{formatTime(selectedLead.processing_time_seconds)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

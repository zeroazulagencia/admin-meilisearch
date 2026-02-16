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
  facebook_cleaned_data?: any;
  facebook_raw_data?: any;
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

const STATUS_LABELS: Record<string, string> = {
  'recibido': 'Recibido',
  'consultando_facebook': 'Consultando FB',
  'limpiando_datos': 'Limpiando',
  'enriqueciendo_ia': 'Procesando IA',
  'clasificando': 'Clasificando',
  'creando_cuenta': 'Creando Cuenta',
  'creando_oportunidad': 'Creando Oportunidad',
  'completado': 'Completado',
  'error': 'Error'
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
  const [consultingMeta, setConsultingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  
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

      const res = await fetch(`/api/modulos/suvi-leads?${params}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
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

  const consultMeta = async (leadId: number) => {
    try {
      setConsultingMeta(true);
      setMetaError(null);

      const res = await fetch(`/api/modulos/suvi-leads/${leadId}/consult-meta`, {
        method: 'POST'
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Error consultando META');
      }

      // Actualizar el lead seleccionado con los nuevos datos
      if (selectedLead) {
        setSelectedLead({
          ...selectedLead,
          facebook_raw_data: data.lead.facebook_raw_data,
          facebook_cleaned_data: data.lead.facebook_cleaned_data,
          processing_status: 'consultando_facebook',
          current_step: 'Datos consultados desde Facebook'
        });
      }

      // Recargar la lista de leads
      loadLeads();

    } catch (e: any) {
      console.error('Error consultando META:', e);
      setMetaError(e.message || 'Error desconocido');
    } finally {
      setConsultingMeta(false);
    }
  };

  const connectSalesforce = () => {
    window.location.href = '/api/oauth/salesforce/authorize';
  };

  const viewDetail = async (leadId: number) => {
    try {
      const res = await fetch(`/api/modulos/suvi-leads/${leadId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
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
    <div className="space-y-4">
      {/* Mensajes de OAuth */}
      {oauthSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-900 text-sm">¡Salesforce conectado exitosamente!</p>
            </div>
          </div>
        </div>
      )}

      {oauthError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-red-900 text-sm">Error: {decodeURIComponent(oauthError)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ROW 1: Salesforce Status + Estadísticas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-6">
          {/* Salesforce Status - Compacto */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Salesforce:</span>
              {salesforceStatus ? (
                <>
                  {salesforceStatus.has_active_tokens ? (
                    <>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Conectado
                      </span>
                      {salesforceStatus.time_until_expiry_minutes !== null && (
                        <span className="text-xs text-gray-500">
                          ({salesforceStatus.time_until_expiry_minutes}m)
                        </span>
                      )}
                      <button
                        onClick={loadSalesforceStatus}
                        className="text-xs text-gray-500 hover:text-gray-700 underline ml-1"
                      >
                        verificar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        No conectado
                      </span>
                      <button
                        onClick={connectSalesforce}
                        className="px-3 py-1 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors text-xs font-semibold ml-2"
                      >
                        Conectar
                      </button>
                    </>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-500">Verificando...</span>
              )}
            </div>
          </div>

          {/* Divisor vertical */}
          <div className="h-10 w-px bg-gray-300"></div>

          {/* Estadísticas compactas */}
          {stats && (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-600 font-medium">Total</span>
                <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
              </div>
              
              <div className="h-10 w-px bg-gray-200"></div>
              
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-600 font-medium">Completados</span>
                <span className="text-2xl font-bold text-green-600">{stats.completados}</span>
              </div>
              
              <div className="h-10 w-px bg-gray-200"></div>
              
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-600 font-medium">En Proceso</span>
                <span className="text-2xl font-bold text-yellow-600">{stats.en_proceso}</span>
              </div>
              
              <div className="h-10 w-px bg-gray-200"></div>
              
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-600 font-medium">Errores</span>
                <span className="text-2xl font-bold text-red-600">{stats.errores}</span>
              </div>
              
              <div className="h-10 w-px bg-gray-200"></div>
              
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-600 font-medium">Tiempo Prom.</span>
                <span className="text-2xl font-bold text-[#5DE1E5]">
                  {formatTime(Math.round(stats.avg_time || 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 2: Filtros compactos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por ID, campaña, cuenta..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos los estados</option>
            <option value="recibido">Recibido</option>
            <option value="enriqueciendo_ia">Enriqueciendo IA</option>
            <option value="completado">Completado</option>
            <option value="error">Error</option>
          </select>
          <select
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
            value={filters.campaign_type}
            onChange={(e) => setFilters({ ...filters, campaign_type: e.target.value })}
          >
            <option value="">Todos los tipos</option>
            <option value="Pauta Interna">Pauta Interna</option>
            <option value="Pauta Agencia">Pauta Agencia</option>
          </select>
          <button
            onClick={loadLeads}
            className="px-4 py-2 text-sm bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-semibold"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* ROW 3: Tabla de Leads */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          lead.campaign_type === 'Pauta Interna' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {lead.campaign_type}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.processing_status]}`}>
                        {STATUS_LABELS[lead.processing_status] || lead.processing_status}
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
                        className="text-[#5DE1E5] hover:text-[#4BC5C9] font-medium"
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
            <div className="sticky top-0 bg-[#5DE1E5] text-gray-900 p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Detalle del Lead</h2>
                  <p className="text-gray-700 font-mono text-sm">{selectedLead.leadgen_id}</p>
                </div>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-gray-700 hover:bg-gray-900 hover:bg-opacity-10 p-2 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Estado actual */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Estado Actual</h3>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[selectedLead.processing_status]}`}>
                    {STATUS_LABELS[selectedLead.processing_status] || selectedLead.processing_status}
                  </span>
                  <span className="text-gray-600 text-sm">{selectedLead.current_step}</span>
                </div>
                {selectedLead.error_message && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm font-medium">{selectedLead.error_message}</p>
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

              {/* Botón Consultar en META */}
              {(!selectedLead.facebook_cleaned_data || Object.keys(selectedLead.facebook_cleaned_data).length === 0) && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => consultMeta(selectedLead.id)}
                    disabled={consultingMeta}
                    className="w-full px-4 py-3 bg-[#5DE1E5] hover:bg-[#4BC5C9] text-gray-900 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {consultingMeta ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full"></div>
                        Consultando en META...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Consultar en META
                      </>
                    )}
                  </button>
                  {metaError && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-800 text-sm">{metaError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Datos del Lead */}
              {selectedLead.facebook_cleaned_data && Object.keys(selectedLead.facebook_cleaned_data).length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Datos del Lead</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                    {Object.entries(selectedLead.facebook_cleaned_data).map(([key, value]) => {
                      // Skip metadata fields
                      if (key.startsWith('_')) return null;
                      
                      return (
                        <div key={key} className="flex justify-between items-start py-2 border-b border-gray-200 last:border-0">
                          <dt className="text-gray-600 font-medium text-sm capitalize">{key.replace(/_/g, ' ')}</dt>
                          <dd className="text-gray-900 text-sm text-right max-w-[60%]">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </dd>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

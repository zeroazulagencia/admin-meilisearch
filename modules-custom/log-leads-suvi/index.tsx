'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Lead {
  id: number;
  leadgen_id: string;
  page_id: string;
  form_id: string;
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
  ai_enriched_data?: any;
  ai_summary?: string;
  ai_processed_at?: string;
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
  'recibido': '1/4 - Recibido',
  'consultando_facebook': '2/4 - Datos META',
  'limpiando_datos': '2/4 - Limpiando',
  'enriqueciendo_ia': '3/4 - Enriquecido con IA',
  'clasificando': '3/4 - Clasificando',
  'creando_cuenta': '3/4 - Creando Cuenta',
  'creando_oportunidad': '3/4 - Creando Oportunidad',
  'completado': '4/4 - Completado',
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
  const [processingAI, setProcessingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [processingSalesforce, setProcessingSalesforce] = useState(false);
  const [salesforceError, setSalesforceError] = useState<string | null>(null);
  const [salesforceResult, setSalesforceResult] = useState<any>(null);
  
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

      // Recargar el lead completo desde la BD
      const detailRes = await fetch(`/api/modulos/suvi-leads/${leadId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const detailData = await detailRes.json();
      
      if (detailData.ok) {
        const lead = detailData.lead;
        
        // Parsear campos JSON si son strings
        if (typeof lead.facebook_cleaned_data === 'string') {
          try {
            lead.facebook_cleaned_data = JSON.parse(lead.facebook_cleaned_data);
          } catch (e) {
            lead.facebook_cleaned_data = {};
          }
        }
        if (typeof lead.facebook_raw_data === 'string') {
          try {
            lead.facebook_raw_data = JSON.parse(lead.facebook_raw_data);
          } catch (e) {
            lead.facebook_raw_data = {};
          }
        }
        if (typeof lead.ai_enriched_data === 'string') {
          try {
            lead.ai_enriched_data = JSON.parse(lead.ai_enriched_data);
          } catch (e) {
            lead.ai_enriched_data = null;
          }
        }
        
        setSelectedLead(lead);
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

  const processAI = async (leadId: number) => {
    try {
      setProcessingAI(true);
      setAiError(null);

      const res = await fetch(`/api/modulos/suvi-leads/reprocess-from-cleaned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Error procesando con IA');
      }

      // Recargar el lead completo desde la BD para asegurar que está parseado correctamente
      const detailRes = await fetch(`/api/modulos/suvi-leads/${leadId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const detailData = await detailRes.json();
      
      if (detailData.ok) {
        const lead = detailData.lead;
        
        // Parsear campos JSON si son strings
        if (typeof lead.facebook_cleaned_data === 'string') {
          try {
            lead.facebook_cleaned_data = JSON.parse(lead.facebook_cleaned_data);
          } catch (e) {
            lead.facebook_cleaned_data = {};
          }
        }
        if (typeof lead.facebook_raw_data === 'string') {
          try {
            lead.facebook_raw_data = JSON.parse(lead.facebook_raw_data);
          } catch (e) {
            lead.facebook_raw_data = {};
          }
        }
        if (typeof lead.ai_enriched_data === 'string') {
          try {
            lead.ai_enriched_data = JSON.parse(lead.ai_enriched_data);
          } catch (e) {
            lead.ai_enriched_data = null;
          }
        }
        
        setSelectedLead(lead);
      }

      // Recargar la lista de leads
      loadLeads();

    } catch (e: any) {
      console.error('Error procesando con IA:', e);
      setAiError(e.message || 'Error desconocido');
    } finally {
      setProcessingAI(false);
    }
  };

  const processSalesforce = async (leadId: number) => {
    try {
      setProcessingSalesforce(true);
      setSalesforceError(null);

      const res = await fetch(`/api/modulos/suvi-leads/process-salesforce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Error procesando en Salesforce');
      }

      // Guardar resultado para mostrar en UI
      setSalesforceResult({
        accountAction: data.accountAction,
        opportunityAction: data.opportunityAction,
        wasAlreadyProcessed: data.wasAlreadyProcessed,
      });

      // Recargar el lead completo desde la BD
      const detailRes = await fetch(`/api/modulos/suvi-leads/${leadId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const detailData = await detailRes.json();
      
      if (detailData.ok) {
        const lead = detailData.lead;
        
        // Parsear campos JSON si son strings
        if (typeof lead.facebook_cleaned_data === 'string') {
          try {
            lead.facebook_cleaned_data = JSON.parse(lead.facebook_cleaned_data);
          } catch (e) {
            lead.facebook_cleaned_data = {};
          }
        }
        if (typeof lead.facebook_raw_data === 'string') {
          try {
            lead.facebook_raw_data = JSON.parse(lead.facebook_raw_data);
          } catch (e) {
            lead.facebook_raw_data = {};
          }
        }
        if (typeof lead.ai_enriched_data === 'string') {
          try {
            lead.ai_enriched_data = JSON.parse(lead.ai_enriched_data);
          } catch (e) {
            lead.ai_enriched_data = null;
          }
        }
        
        setSelectedLead(lead);
      }

      // Recargar la lista de leads
      loadLeads();

    } catch (e: any) {
      console.error('Error procesando Salesforce:', e);
      setSalesforceError(e.message || 'Error desconocido');
    } finally {
      setProcessingSalesforce(false);
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
        // Limpiar estados previos de procesamiento
        setSalesforceResult(null);
        setSalesforceError(null);
        setAiError(null);
        setMetaError(null);
        setConsultingMeta(false);
        setProcessingAI(false);
        setProcessingSalesforce(false);
        
        // Parsear campos JSON si son strings
        const lead = data.lead;
        if (typeof lead.facebook_cleaned_data === 'string') {
          try {
            lead.facebook_cleaned_data = JSON.parse(lead.facebook_cleaned_data);
          } catch (e) {
            lead.facebook_cleaned_data = {};
          }
        }
        if (typeof lead.facebook_raw_data === 'string') {
          try {
            lead.facebook_raw_data = JSON.parse(lead.facebook_raw_data);
          } catch (e) {
            lead.facebook_raw_data = {};
          }
        }
        if (typeof lead.ai_enriched_data === 'string') {
          try {
            lead.ai_enriched_data = JSON.parse(lead.ai_enriched_data);
          } catch (e) {
            lead.ai_enriched_data = null;
          }
        }
        setSelectedLead(lead);
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
            placeholder="Buscar por ID, form, cuenta..."
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
            <option value="consultando_facebook">Consultando FB</option>
            <option value="completado">Completado</option>
            <option value="error">Error</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form ID</th>
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
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {lead.form_id ? lead.form_id.substring(0, 12) + '...' : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.processing_status] || 'bg-gray-100 text-gray-800'}`}>
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
                  onClick={() => {
                    setShowDetail(false);
                    // Limpiar estados de procesamiento al cerrar
                    setSalesforceResult(null);
                    setSalesforceError(null);
                    setAiError(null);
                    setMetaError(null);
                    setConsultingMeta(false);
                    setProcessingAI(false);
                    setProcessingSalesforce(false);
                  }}
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
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[selectedLead.processing_status] || 'bg-gray-100 text-gray-800'}`}>
                    {STATUS_LABELS[selectedLead.processing_status] || selectedLead.processing_status}
                  </span>
                  <span className="text-gray-600 text-sm">{selectedLead.current_step}</span>
                </div>
                {/* Solo mostrar error si el estado actual es error, no si ya se completó */}
                {selectedLead.error_message && selectedLead.processing_status === 'error' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm font-medium">{selectedLead.error_message}</p>
                  </div>
                )}
              </div>

              {/* Timeline de Procesamiento */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-4">Progreso del Lead</h3>
                <div className="space-y-4">
                  
                  {/* Paso 1: Lead Recibido */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">1. Lead Recibido</h4>
                        <span className="text-xs text-gray-500">{formatDate(selectedLead.received_at)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Lead recibido desde Facebook</p>
                      <div className="text-xs text-gray-500 mt-2 space-y-1">
                        <div><span className="font-medium">Leadgen ID:</span> {selectedLead.leadgen_id}</div>
                        <div><span className="font-medium">Form ID:</span> {selectedLead.form_id || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Paso 2: Consultar en META */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                        selectedLead.facebook_cleaned_data && Object.keys(selectedLead.facebook_cleaned_data).length > 0
                          ? 'bg-green-100 border-green-500'
                          : 'bg-gray-100 border-gray-300'
                      }`}>
                        {selectedLead.facebook_cleaned_data && Object.keys(selectedLead.facebook_cleaned_data).length > 0 ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-gray-500 font-bold">2</span>
                        )}
                      </div>
                      <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">2. Consultar Datos en META</h4>
                        {selectedLead.facebook_cleaned_data && Object.keys(selectedLead.facebook_cleaned_data).length > 0 && (
                          <span className="text-xs text-gray-500">Completado</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Obtener información del formulario desde Facebook</p>
                      
                      {selectedLead.facebook_cleaned_data && Object.keys(selectedLead.facebook_cleaned_data).length > 0 ? (
                        <button
                          onClick={() => consultMeta(selectedLead.id)}
                          disabled={consultingMeta}
                          className="mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Actualizar datos
                        </button>
                      ) : (
                        <button
                          onClick={() => consultMeta(selectedLead.id)}
                          disabled={consultingMeta}
                          className="mt-3 px-4 py-2 bg-[#5DE1E5] hover:bg-[#4BC5C9] text-gray-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {consultingMeta ? '⏳ Consultando...' : '▶️ Consultar en META'}
                        </button>
                      )}
                      
                      {metaError && (
                        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
                          <p className="text-red-800 text-xs">{metaError}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Paso 3: Enriquecimiento con IA */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                        selectedLead.ai_enriched_data
                          ? 'bg-green-100 border-green-500'
                          : 'bg-gray-100 border-gray-300'
                      }`}>
                        {selectedLead.ai_enriched_data ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-gray-500 font-bold">3</span>
                        )}
                      </div>
                      <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <h4 className={`font-semibold ${selectedLead.ai_enriched_data ? 'text-green-600' : 'text-gray-400'}`}>
                        3. Enriquecimiento con IA
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Análisis y clasificación automática con GPT-4 Turbo
                      </p>
                      
                      {selectedLead.facebook_cleaned_data && Object.keys(selectedLead.facebook_cleaned_data).length > 0 && (
                        selectedLead.ai_enriched_data ? (
                          <button
                            onClick={() => processAI(selectedLead.id)}
                            disabled={processingAI}
                            className="mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            Reprocesar con IA
                          </button>
                        ) : (
                          <button
                            onClick={() => processAI(selectedLead.id)}
                            disabled={processingAI}
                            className="mt-3 px-4 py-2 bg-[#5DE1E5] hover:bg-[#4BC5C9] text-gray-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingAI ? 'Procesando...' : 'Procesar con IA'}
                          </button>
                        )
                      )}
                      
                      {aiError && (
                        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
                          <p className="text-red-800 text-xs">{aiError}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Paso 4: Salesforce */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                        selectedLead.salesforce_opportunity_id
                          ? 'bg-green-100 border-green-500'
                          : 'bg-gray-100 border-gray-300'
                      }`}>
                        {selectedLead.salesforce_opportunity_id ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-gray-500 font-bold">4</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${selectedLead.salesforce_opportunity_id ? 'text-green-600' : selectedLead.ai_enriched_data ? 'text-gray-900' : 'text-gray-400'}`}>
                        4. Envío a Salesforce
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">Crear cuenta y oportunidad en Salesforce</p>
                      
                      {selectedLead.ai_enriched_data && salesforceStatus?.has_active_tokens && (
                        <button
                          onClick={() => processSalesforce(selectedLead.id)}
                          disabled={processingSalesforce}
                          className="mt-3 px-4 py-2 bg-[#5DE1E5] hover:bg-[#4BC5C9] text-gray-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingSalesforce ? 'Procesando...' : (selectedLead.salesforce_opportunity_id ? 'Reprocesar en Salesforce' : 'Procesar en Salesforce')}
                        </button>
                      )}
                      
                      {salesforceError && (
                        <div className="mt-2 text-xs text-red-600">{salesforceError}</div>
                      )}
                      
                      {salesforceResult && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                          <p className="text-green-700">
                            <span className="font-medium">Cuenta:</span> {salesforceResult.accountAction === 'created' ? 'Creada' : 'Actualizada'}
                          </p>
                          <p className="text-green-700">
                            <span className="font-medium">Oportunidad:</span> {salesforceResult.opportunityAction === 'created' ? 'Creada' : 'Actualizada'}
                          </p>
                        </div>
                      )}
                      
                      {selectedLead.salesforce_account_name && (
                        <div className="mt-2 text-xs text-gray-600">
                          <div><span className="font-medium">Cuenta:</span> {selectedLead.salesforce_account_name}</div>
                          {selectedLead.salesforce_opportunity_id && (
                            <div><span className="font-medium">Oportunidad:</span> {selectedLead.salesforce_opportunity_id}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Datos del Lead */}
              {selectedLead.facebook_cleaned_data && typeof selectedLead.facebook_cleaned_data === 'object' && Object.keys(selectedLead.facebook_cleaned_data).length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Datos del Lead</h3>
                    {selectedLead.ai_enriched_data && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        Enriquecido con IA
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                    {/* Mapeo de campos importantes */}
                    {(() => {
                      const fbData = selectedLead.facebook_cleaned_data;
                      const aiData = selectedLead.ai_enriched_data;
                      
                      // DEBUG: Verificar que aiData existe
                      
                      // Campos a mostrar en orden
                      const fieldsToShow = [
                        { key: 'fullname', label: 'Nombre Completo', aiKey: 'fullname' },
                        { key: 'firstname', label: 'Nombre', aiKey: 'firstname' },
                        { key: 'lastname', label: 'Apellido', aiKey: 'lastname' },
                        { key: 'email', label: 'Email', aiKey: 'email' },
                        { key: 'phone', label: 'Teléfono', aiKey: 'phone' },
                        { key: 'prefijo', label: 'Prefijo Internacional', aiKey: 'prefijo' },
                        { key: 'pais_salesforce', label: 'País', aiKey: 'pais_salesforce' },
                        { key: 'state', label: 'Estado/Ciudad', aiKey: 'state' },
                        { key: 'proyecto_de_interes', label: 'Proyecto de Interés', aiKey: 'proyecto_de_interes' },
                        { key: 'servicio_de_interes', label: 'Servicio de Interés', aiKey: 'servicio_de_interes' },
                      ];
                      
                      return fieldsToShow.map(({ key, label, aiKey }) => {
                        // Buscar valor en FB (puede tener diferentes keys)
                        let fbValue = fbData[key];
                        
                        // Variantes de keys de Facebook (mal formateadas)
                        if (!fbValue && key === 'proyecto_de_interes') {
                          fbValue = fbData['proyecto_de_inter_s'];
                        }
                        if (!fbValue && key === 'servicio_de_interes') {
                          fbValue = fbData['servicio_de_inter_s'];
                        }
                        
                        const aiValue = aiData?.[aiKey];
                        
                        // Si no hay ningún valor, no mostrar
                        if (!fbValue && !aiValue) return null;
                        
                        // Determinar qué valor usar y si fue enriquecido
                        const displayValue = aiValue || fbValue;
                        const wasEnriched = aiValue && aiValue !== fbValue;
                        
                        // DEBUG: Log detallado para cada campo
                        
                        return (
                          <div key={key} className={`flex justify-between items-start py-2 border-b border-gray-200 last:border-0 ${wasEnriched ? 'bg-purple-50 px-2 rounded' : ''}`}>
                            <dt className="text-gray-700 font-medium text-sm flex items-center gap-2">
                              {label}
                              {wasEnriched && (
                                <span className="text-xs text-purple-600 font-normal">(Corregido por IA)</span>
                              )}
                            </dt>
                            <dd className="text-gray-900 text-sm text-right max-w-[60%] break-words">
                              {Array.isArray(displayValue) ? displayValue.join(', ') : String(displayValue)}
                            </dd>
                          </div>
                        );
                      });
                    })()}
                    
                    {/* Otros campos de Facebook que no están en la lista principal */}
                    {Object.entries(selectedLead.facebook_cleaned_data).map(([key, value]) => {
                      // Skip metadata y campos ya mostrados
                      if (key.startsWith('_')) return null;
                      
                      // Lista de campos principales (incluyendo variantes con guiones bajos mal formateados)
                      const mainFields = [
                        'fullname', 'firstname', 'lastname', 'email', 'phone', 'prefijo', 
                        'pais_salesforce', 'state', 'proyecto_de_interes', 'servicio_de_interes',
                        'servicio_de_inter_s', 'proyecto_de_inter_s', // Variantes mal formateadas de Facebook
                        'Ubicacion__c', 'Ubicacion_c' // Variantes de ubicación
                      ];
                      
                      if (mainFields.includes(key)) return null;
                      
                      return (
                        <div key={key} className="flex justify-between items-start py-2 border-b border-gray-200 last:border-0">
                          <dt className="text-gray-600 font-medium text-sm capitalize">{key.replace(/_/g, ' ')}</dt>
                          <dd className="text-gray-900 text-sm text-right max-w-[60%] break-words">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </dd>
                        </div>
                      );
                    })}
                    
                    {/* Campos adicionales de IA */}
                    {selectedLead.ai_enriched_data?.description && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <dt className="text-gray-700 font-medium text-sm mb-2">Información Adicional</dt>
                        <dd className="text-gray-600 text-xs bg-white p-3 rounded border border-gray-200">
                          {selectedLead.ai_enriched_data.description}
                        </dd>
                      </div>
                    )}
                    
                    {selectedLead.ai_processed_at && (
                      <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-500">
                        Enriquecido con IA el {new Date(selectedLead.ai_processed_at).toLocaleString('es-ES')}
                      </div>
                    )}
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

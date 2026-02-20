'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { translateSalesforceError, FriendlyError } from './utils/error-translator';


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
  salesforce_owner_id: string;
  opportunity_type_id: string;
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
  'consultando_facebook': 'bg-purple-50 text-purple-700',
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

// Componente para mostrar errores de forma amigable
function ErrorDisplay({ error }: { error: FriendlyError }) {
  const [showTechnical, setShowTechnical] = useState(false);
  
  return (
    <div className={`mt-3 border-l-4 ${
      error.icon === '⚠️' ? 'border-orange-400 bg-orange-50' : 'border-red-400 bg-red-50'
    } p-3 rounded`}>
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0">{error.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${
            error.icon === '⚠️' ? 'text-orange-900' : 'text-red-900'
          }`}>
            {error.title}
          </h4>
          <p className={`text-sm mt-1 ${
            error.icon === '⚠️' ? 'text-orange-800' : 'text-red-800'
          }`}>
            {error.message}
          </p>
          
          {error.field && (
            <div className={`text-xs mt-2 ${
              error.icon === '⚠️' ? 'text-orange-700' : 'text-red-700'
            }`}>
              <strong>Campo afectado:</strong> {error.field}
            </div>
          )}
          
          {error.suggestion && (
            <div className={`mt-2 rounded p-2 text-xs ${
              error.icon === '⚠️' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
            }`}>
              💡 <strong>Solución:</strong> {error.suggestion}
            </div>
          )}
          
          {error.technical && (
            <details className="mt-2">
              <summary className={`text-xs cursor-pointer hover:underline ${
                error.icon === '⚠️' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {showTechnical ? '▼' : '▶'} Ver detalles técnicos
              </summary>
              <pre className="mt-2 text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                {error.technical}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LogLeadsSUVI() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number; } | null>(null);
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
  
  // Estados para procesamiento en lote
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'leads' | 'bloqueados' | 'flujo' | 'config'>('leads');
  const [blockedForms, setBlockedForms] = useState<string[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [newFormId, setNewFormId] = useState('');
  const [blockedMsg, setBlockedMsg] = useState('');
  const [batchCancelled, setBatchCancelled] = useState(false);
  
  // Estados para configuracion del modulo
  const [moduleConfigs, setModuleConfigs] = useState<Array<{ key: string; value_masked: string; has_value: boolean; is_sensitive: boolean; is_editable: boolean }>>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [editingConfig, setEditingConfig] = useState<{ key: string; value: string } | null>(null);
  const [configMsg, setConfigMsg] = useState('');
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    current: number;
    currentLeadId: string;
    currentStep: string;
    processed: number;
    errors: number;
    consecutiveErrors: number;
    logs: Array<{ leadId: string; status: 'success' | 'error'; message: string; }>;
  }>({
    total: 0,
    current: 0,
    currentLeadId: '',
    currentStep: '',
    processed: 0,
    errors: 0,
    consecutiveErrors: 0,
    logs: []
  });
  
  const oauthSuccess = searchParams.get('oauth_success');
  const oauthError = searchParams.get('oauth_error');

  useEffect(() => {
    loadLeads();
    loadSalesforceStatus();
    loadBlockedForms();
    loadModuleConfigs();
  }, [page, filters]);

  // Recargar estado de Salesforce cuando se conecta exitosamente
  useEffect(() => {
    if (oauthSuccess) {
      setTimeout(() => {
        loadSalesforceStatus();
      }, 1000);
    }
  }, [oauthSuccess]);

  const loadModuleConfigs = async () => {
    try {
      setConfigsLoading(true);
      const res = await fetch('/api/custom-module1/log-leads-suvi/config?all=true');
      const data = await res.json();
      if (data.ok) setModuleConfigs(data.configs || []);
    } catch {} finally {
      setConfigsLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!editingConfig || !editingConfig.value.trim()) return;
    setConfigsLoading(true);
    setConfigMsg('');
    try {
      const res = await fetch('/api/custom-module1/log-leads-suvi/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editingConfig.key, value: editingConfig.value }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfigMsg('Configuracion guardada correctamente');
        setEditingConfig(null);
        loadModuleConfigs();
      } else {
        setConfigMsg('Error: ' + (data.error || 'No se pudo guardar'));
      }
    } catch (e: any) {
      setConfigMsg('Error: ' + e.message);
    }
    setConfigsLoading(false);
  };

  const testConfig = async (key: string) => {
    setTestingKey(key);
    setConfigMsg('');
    try {
      const res = await fetch('/api/custom-module1/log-leads-suvi/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.valid) {
        setConfigMsg(data.message || 'Configuracion valida');
      } else {
        setConfigMsg('Error: ' + (data.message || 'Configuracion invalida'));
      }
    } catch (e: any) {
      setConfigMsg('Error: ' + e.message);
    }
    setTestingKey(null);
  };

  const loadBlockedForms = async () => {
    try {
      const res = await fetch('/api/custom-module1/log-leads-suvi/config');
      const data = await res.json();
      if (data.ok) setBlockedForms(data.blocked_form_ids);
    } catch {}
  };

  const saveBlockedForms = async (list: string[]) => {
    setBlockedLoading(true);
    setBlockedMsg('');
    try {
      const res = await fetch('/api/custom-module1/log-leads-suvi/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_form_ids: list }),
      });
      const data = await res.json();
      if (data.ok) {
        setBlockedForms(data.blocked_form_ids);
        setBlockedMsg('Guardado correctamente');
      } else {
        setBlockedMsg('Error: ' + (data.error || 'No se pudo guardar'));
      }
    } catch (e: any) {
      setBlockedMsg('Error: ' + e.message);
    }
    setBlockedLoading(false);
  };

  const addBlockedForm = () => {
    const id = newFormId.trim();
    if (!id || blockedForms.includes(id)) return;
    const updated = [...blockedForms, id];
    setNewFormId('');
    saveBlockedForms(updated);
  };

  const removeBlockedForm = (id: string) => {
    saveBlockedForms(blockedForms.filter(f => f !== id));
  };

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100',
        ...(filters.status && { status: filters.status }),
        ...(filters.campaign_type && { campaign_type: filters.campaign_type }),
        ...(filters.search && { search: filters.search })
      });

      const res = await fetch(`/api/custom-module1/log-leads-suvi?${params}`, {
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
        setPagination(data.pagination);
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

      const res = await fetch(`/api/custom-module1/log-leads-suvi/${leadId}/consult-meta`, {
        method: 'POST'
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Error consultando META');
      }

      // Recargar el lead completo desde la BD
      const detailRes = await fetch(`/api/custom-module1/log-leads-suvi/${leadId}`, {
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

      const res = await fetch(`/api/custom-module1/log-leads-suvi/reprocess-from-cleaned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Error procesando con IA');
      }

      // Recargar el lead completo desde la BD para asegurar que está parseado correctamente
      const detailRes = await fetch(`/api/custom-module1/log-leads-suvi/${leadId}`, {
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

      const res = await fetch(`/api/custom-module1/log-leads-suvi/process-salesforce`, {
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
      const detailRes = await fetch(`/api/custom-module1/log-leads-suvi/${leadId}`, {
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

  const processAllIncomplete = async () => {
    try {
      setBatchProcessing(true);
      setShowBatchModal(true);
      setBatchCancelled(false);
      
      // Obtener todos los leads incompletos
      const res = await fetch('/api/custom-module1/log-leads-suvi/incomplete', {
        cache: 'no-store'
      });
      const data = await res.json();
      
      if (!data.ok || !data.leads || data.leads.length === 0) {
        setBatchProgress(prev => ({
          ...prev,
          logs: [{ leadId: '-', status: 'error', message: 'No hay leads incompletos para procesar' }]
        }));
        setBatchProcessing(false);
        return;
      }
      
      const leads = data.leads;
      setBatchProgress({
        total: leads.length,
        current: 0,
        currentLeadId: '',
        currentStep: '',
        processed: 0,
        errors: 0,
        consecutiveErrors: 0,
        logs: []
      });
      
      // Contador local de errores consecutivos (fuera del estado de React)
      let consecutiveErrorCount = 0;
      
      // Procesar cada lead
      for (let i = 0; i < leads.length; i++) {
        // Verificar si el usuario canceló
        if (batchCancelled) {
          setBatchProgress(prev => ({
            ...prev,
            currentStep: 'Procesamiento cancelado por el usuario',
            logs: [...prev.logs, { 
              leadId: '-', 
              status: 'error', 
              message: 'Procesamiento detenido manualmente' 
            }]
          }));
          break;
        }
        
        const lead = leads[i];
        
        setBatchProgress(prev => ({
          ...prev,
          current: i + 1,
          currentLeadId: lead.leadgen_id,
          currentStep: `Procesando lead ${i + 1} de ${leads.length}...`
        }));
        
        try {
          // Determinar qué pasos faltan
          const needsMeta = !lead.facebook_cleaned_data;
          const needsAI = lead.facebook_cleaned_data && !lead.ai_enriched_data;
          const needsSalesforce = lead.ai_enriched_data && !lead.salesforce_opportunity_id;
          
          // Paso 1: Consultar META si falta
          if (needsMeta) {
            setBatchProgress(prev => ({ ...prev, currentStep: `Lead ${lead.leadgen_id}: Consultando META...` }));
            const metaRes = await fetch(`/api/custom-module1/log-leads-suvi/${lead.id}/consult-meta`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            // Verificar si la respuesta es OK antes de parsear JSON
            if (!metaRes.ok) {
              const errorText = await metaRes.text();
              // Intentar parsear el error como JSON para obtener el mensaje real
              let errorMessage = `META (${metaRes.status}): ${errorText}`;
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error) {
                  errorMessage = `META: ${errorJson.error}`;
                }
              } catch (e) {
                // Si falla el parse, usar el mensaje por defecto
              }
              throw new Error(errorMessage);
            }
            
            const metaData = await metaRes.json();
            if (!metaData.ok) throw new Error(`META: ${metaData.error}`);
            
            // Recargar lead actualizado de BD
            const reloadRes = await fetch(`/api/custom-module1/log-leads-suvi/${lead.id}`, { cache: 'no-store' });
            if (reloadRes.ok) {
              const reloadData = await reloadRes.json();
              if (reloadData.ok) {
                Object.assign(lead, reloadData.lead);
              }
            }
          }
          
          // Paso 2: Procesar con IA si falta (recalcular needsAI)
          const needsAIAfterMeta = lead.facebook_cleaned_data && !lead.ai_enriched_data;
          if (needsAI || needsAIAfterMeta) {
            setBatchProgress(prev => ({ ...prev, currentStep: `Lead ${lead.leadgen_id}: Enriqueciendo con IA...` }));
            const aiRes = await fetch(`/api/custom-module1/log-leads-suvi/reprocess-from-cleaned`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leadId: lead.id })
            });
            
            // Verificar si la respuesta es OK antes de parsear JSON
            if (!aiRes.ok) {
              const errorText = await aiRes.text();
              // Intentar parsear el error como JSON para obtener el mensaje real
              let errorMessage = `IA (${aiRes.status}): ${errorText}`;
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error) {
                  errorMessage = `IA: ${errorJson.error}`;
                }
              } catch (e) {
                // Si falla el parse, usar el mensaje por defecto
              }
              throw new Error(errorMessage);
            }
            
            const aiData = await aiRes.json();
            if (!aiData.ok) throw new Error(`IA: ${aiData.error}`);
            
            // Recargar lead actualizado de BD
            const reloadRes = await fetch(`/api/custom-module1/log-leads-suvi/${lead.id}`, { cache: 'no-store' });
            if (reloadRes.ok) {
              const reloadData = await reloadRes.json();
              if (reloadData.ok) {
                Object.assign(lead, reloadData.lead);
              }
            }
          }
          
          // Paso 3: Enviar a Salesforce si falta (recalcular needsSalesforce)
          const needsSalesforceAfterAI = lead.ai_enriched_data && !lead.salesforce_opportunity_id;
          if (needsSalesforce || needsSalesforceAfterAI) {
            setBatchProgress(prev => ({ ...prev, currentStep: `Lead ${lead.leadgen_id}: Enviando a Salesforce...` }));
            const sfRes = await fetch(`/api/custom-module1/log-leads-suvi/process-salesforce`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leadId: lead.id })
            });
            
            // Verificar si la respuesta es OK antes de parsear JSON
            if (!sfRes.ok) {
              const errorText = await sfRes.text();
              // Intentar parsear el error como JSON para obtener el mensaje real
              let errorMessage = `Salesforce (${sfRes.status}): ${errorText}`;
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error) {
                  errorMessage = `Salesforce: ${errorJson.error}`;
                }
              } catch (e) {
                // Si falla el parse, usar el mensaje por defecto
              }
              throw new Error(errorMessage);
            }
            
            const sfData = await sfRes.json();
            if (!sfData.ok) throw new Error(`Salesforce: ${sfData.error}`);
          }
          
          // Éxito - resetear contador de errores consecutivos
          consecutiveErrorCount = 0;
          setBatchProgress(prev => ({
            ...prev,
            processed: prev.processed + 1,
            consecutiveErrors: 0,
            logs: [...prev.logs, { 
              leadId: lead.leadgen_id, 
              status: 'success', 
              message: 'Procesado exitosamente' 
            }]
          }));
          
        } catch (error: any) {
          // Error en este lead, registrar y continuar
          consecutiveErrorCount++;
          setBatchProgress(prev => ({
            ...prev,
            errors: prev.errors + 1,
            consecutiveErrors: consecutiveErrorCount,
            logs: [...prev.logs, { 
              leadId: lead.leadgen_id, 
              status: 'error', 
              message: error.message || 'Error desconocido' 
            }]
          }));
          
          // Detener si hay 5 errores consecutivos
          if (consecutiveErrorCount >= 5) {
            setBatchProgress(prev => ({
              ...prev,
              currentStep: 'Procesamiento detenido: 5 errores consecutivos',
              logs: [...prev.logs, { 
                leadId: '-', 
                status: 'error', 
                message: '⛔ Detenido automáticamente por 5 errores consecutivos' 
              }]
            }));
            break;
          }
        }
        
        // Delay de 1 segundo entre cada lead
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Finalizar
      setBatchProgress(prev => ({
        ...prev,
        currentStep: prev.currentStep.includes('detenido') || prev.currentStep.includes('cancelado') 
          ? prev.currentStep 
          : 'Procesamiento completado',
        currentLeadId: ''
      }));
      
      // Recargar leads
      loadLeads();
      
    } catch (error: any) {
      console.error('Error en procesamiento en lote:', error);
      setBatchProgress(prev => ({
        ...prev,
        logs: [...prev.logs, { 
          leadId: '-', 
          status: 'error', 
          message: `Error general: ${error.message}` 
        }]
      }));
    } finally {
      setBatchProcessing(false);
    }
  };

  const viewDetail = async (leadId: number) => {
    try {
      const res = await fetch(`/api/custom-module1/log-leads-suvi/${leadId}`, {
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
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'leads',    label: 'Leads' },
          { id: 'bloqueados', label: 'Formularios Bloqueados' },
          { id: 'config',   label: 'Configuracion' },
          { id: 'flujo',    label: 'Flujo y Documentacion' },
        ] as const).map(t => (
          <button
            key={t.id}
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

      {activeTab === 'leads' && (<>
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
            <div className="w-10 h-10 bg-[#5DE1E5] rounded-lg flex items-center justify-center flex-shrink-0">
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
                        className="px-3 py-1 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#5DE1E5]-dark transition-colors text-xs font-semibold ml-2"
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
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
            className="px-4 py-2 text-sm bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#5DE1E5]-dark transition-colors font-semibold"
          >
            Actualizar
          </button>
          <button
            onClick={processAllIncomplete}
            disabled={batchProcessing || !salesforceStatus?.has_active_tokens}
            className="px-4 py-2 text-sm bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={!salesforceStatus?.has_active_tokens ? 'Conecta Salesforce primero' : 'Procesar todos los leads incompletos'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {batchProcessing ? 'Procesando...' : 'Procesar Todos'}
          </button>
        </div>
      </div>

      {/* ROW 3: Tabla de Leads */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full" style={{ borderColor: "#5DE1E5" }}></div>
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
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID Facebook</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Form ID</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cuenta SF</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recibido</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="px-2 py-2 text-xs font-mono text-gray-900">
                      {lead.leadgen_id}
                    </td>
                    <td className="px-2 py-2 text-xs font-mono text-gray-600">
                      {lead.form_id || '-'}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-700">
                      {(() => {
                        try {
                          const enrichedData = typeof lead.ai_enriched_data === 'string' 
                            ? JSON.parse(lead.ai_enriched_data) 
                            : lead.ai_enriched_data;
                          return enrichedData?.phone || '-';
                        } catch {
                          return '-';
                        }
                      })()}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.processing_status] || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_LABELS[lead.processing_status] || lead.processing_status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      {lead.salesforce_account_name || '-'}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500">
                      {formatDate(lead.received_at)}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <button
                        onClick={() => viewDetail(lead.id)}
                        className="text-[#5DE1E5] hover:text-[#5DE1E5]-dark font-medium"
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
        
        {/* Paginación */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Mostrando {leads.length} de {pagination.total} leads
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Página {page} de {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
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
                          className="mt-3 px-4 py-2 bg-[#5DE1E5] hover:bg-[#5DE1E5]-dark text-gray-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="mt-3 px-4 py-2 bg-[#5DE1E5] hover:bg-[#5DE1E5]-dark text-gray-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          : selectedLead.processing_status === 'error' && selectedLead.current_step?.includes('Salesforce')
                          ? 'bg-red-100 border-red-500'
                          : 'bg-gray-100 border-gray-300'
                      }`}>
                        {selectedLead.salesforce_opportunity_id ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : selectedLead.processing_status === 'error' && selectedLead.current_step?.includes('Salesforce') ? (
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <span className="text-gray-500 font-bold">4</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${
                        selectedLead.salesforce_opportunity_id ? 'text-green-600' : 
                        selectedLead.processing_status === 'error' && selectedLead.current_step?.includes('Salesforce') ? 'text-red-600' :
                        selectedLead.ai_enriched_data ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        4. Envío a Salesforce
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">Crear cuenta y oportunidad en Salesforce</p>
                      
                      {/* Sub-progreso: Mostrar paso actual si está procesando */}
                      {!selectedLead.salesforce_opportunity_id && 
                       selectedLead.processing_status !== 'error' &&
                       selectedLead.processing_status !== 'completado' && 
                       selectedLead.current_step && 
                       (selectedLead.processing_status === 'creando_cuenta' || selectedLead.processing_status === 'creando_oportunidad') && (
                        <div className="mt-2 pl-4 border-l-2 border-cyan-300">
                          <div className="text-sm text-cyan-700 flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {selectedLead.current_step}
                          </div>
                        </div>
                      )}
                      
                      {/* Botón para procesar en Salesforce */}
                      {selectedLead.ai_enriched_data && salesforceStatus?.has_active_tokens && (
                        <button
                          onClick={() => processSalesforce(selectedLead.id)}
                          disabled={processingSalesforce}
                          className="mt-3 px-4 py-2 bg-[#5DE1E5] hover:bg-[#5DE1E5]-dark text-gray-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingSalesforce ? 'Procesando...' : (selectedLead.salesforce_opportunity_id ? 'Reprocesar en Salesforce' : 'Procesar en Salesforce')}
                        </button>
                      )}
                      
                      {/* Error de Salesforce con formato amigable */}
                      {salesforceError && (
                        <ErrorDisplay error={translateSalesforceError(salesforceError)} />
                      )}
                      
                      {/* Resultado de procesamiento manual (cuando se hace clic en el botón) */}
                      {salesforceResult && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-sm space-y-1">
                            <div className="flex items-start gap-2">
                              <span className="text-green-600 flex-shrink-0 mt-0.5"></span>
                              <div className="flex-1">
                                <strong className="text-green-900">Cuenta:</strong>{' '}
                                <span className="text-green-800">{salesforceResult.accountAction === 'created' ? 'Creada' : 'Actualizada'}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-green-600 flex-shrink-0 mt-0.5"></span>
                              <div className="flex-1">
                                <strong className="text-green-900">Oportunidad:</strong>{' '}
                                <span className="text-green-800">{salesforceResult.opportunityAction === 'created' ? 'Creada' : 'Actualizada'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Resultado final del lead ya procesado (desde la base de datos) */}
                      {!salesforceResult && (selectedLead.salesforce_account_name || selectedLead.salesforce_opportunity_id) && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-sm space-y-1">
                            {selectedLead.salesforce_account_name && (
                              <div className="flex items-start gap-2">
                                <span className="text-green-600 flex-shrink-0 mt-0.5"></span>
                                <div className="flex-1">
                                  <strong className="text-green-900">Cuenta:</strong>{' '}
                                  <span className="text-green-800">{selectedLead.salesforce_account_name}</span>
                                </div>
                              </div>
                            )}
                            {selectedLead.salesforce_opportunity_id && (
                              <div className="flex items-start gap-2">
                                <span className="text-green-600 flex-shrink-0 mt-0.5"></span>
                                <div className="flex-1">
                                  <strong className="text-green-900">Oportunidad:</strong>{' '}
                                  <span className="text-green-800">{selectedLead.salesforce_opportunity_id}</span>
                                </div>
                              </div>
                            )}
                            {selectedLead.salesforce_owner_id && (
                              <div className="flex items-start gap-2">
                                <span className="text-green-600 flex-shrink-0 mt-0.5"></span>
                                <div className="flex-1">
                                  <strong className="text-green-900">Asesor asignado:</strong>{' '}
                                  <span className="text-green-800 font-mono text-xs">{selectedLead.salesforce_owner_id}</span>
                                </div>
                              </div>
                            )}
                            {selectedLead.opportunity_type_id && (
                              <div className="flex items-start gap-2">
                                <span className="text-green-600 flex-shrink-0 mt-0.5"></span>
                                <div className="flex-1">
                                  <strong className="text-green-900">Tipo de oportunidad:</strong>{' '}
                                  <span className="text-green-800 font-mono text-xs">{selectedLead.opportunity_type_id}</span>
                                </div>
                              </div>
                            )}
                          </div>
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
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded">
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
                        { key: 'phone', label: 'Teléfono', aiKey: 'phone' },
                        { key: 'firstname', label: 'Nombre', aiKey: 'firstname' },
                        { key: 'lastname', label: 'Apellido', aiKey: 'lastname' },
                        { key: 'email', label: 'Email', aiKey: 'email' },
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

      {/* Modal de Procesamiento en Lote */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-[#5DE1E5] p-6 text-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Procesamiento en Lote</h2>
                  <p className="text-white text-sm mt-1">
                    {batchProcessing ? 'Procesando leads incompletos...' : 'Procesamiento finalizado'}
                  </p>
                </div>
                {!batchProcessing && (
                  <button
                    onClick={() => setShowBatchModal(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progreso: {batchProgress.current} / {batchProgress.total}
                </span>
                <span className="text-sm text-gray-600">
                  OK: {batchProgress.processed} | ERR: {batchProgress.errors}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-[#5DE1E5] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                ></div>
              </div>
              
              {batchProcessing && batchProgress.currentStep && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="animate-spin h-5 w-5 border-2 border-secondary border-t-transparent rounded-full"></div>
                    <span className="text-gray-700">{batchProgress.currentStep}</span>
                  </div>
                  <button
                    onClick={() => setBatchCancelled(true)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Detener
                  </button>
                </div>
              )}
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Registro de Procesamiento:</h3>
              {batchProgress.logs.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Esperando procesamiento...</p>
              ) : (
                <div className="space-y-2">
                  {batchProgress.logs.map((log, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                        log.status === 'success' 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <span className="flex-shrink-0 mt-0.5">
                        {log.status === 'success' ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${log.status === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                          Lead: {log.leadId}
                        </p>
                        <p className={`text-xs mt-0.5 ${log.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                          {log.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!batchProcessing && (
              <div className="p-6 border-t bg-gray-50">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="w-full px-4 py-3 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-semibold"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </>)}

      {/* TAB: Formularios Bloqueados */}
      {activeTab === 'bloqueados' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Formularios Bloqueados</h2>
            <p className="text-sm text-gray-500">
              Los leads cuyo <code className="bg-gray-100 px-1 rounded text-xs">form_id</code> esté en esta lista son ignorados completamente al recibir el webhook: no se guardan en la base de datos ni se procesan.
            </p>
          </div>

          {/* Agregar */}
          <div className="flex gap-3">
            <input
              type="text"
              value={newFormId}
              onChange={e => setNewFormId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addBlockedForm()}
              placeholder="ID del formulario a bloquear"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addBlockedForm}
              disabled={blockedLoading || !newFormId.trim()}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              Agregar
            </button>
          </div>

          {blockedMsg && (
            <p className={`text-sm ${blockedMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {blockedMsg}
            </p>
          )}

          {/* Lista */}
          {blockedForms.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay formularios bloqueados</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Form ID</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">Accion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {blockedForms.map(id => (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-800">{id}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeBlockedForm(id)}
                          disabled={blockedLoading}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Configuracion */}
      {activeTab === 'config' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Configuracion del Modulo</h2>
            <p className="text-sm text-gray-500">
              Configuraciones almacenadas en la tabla del modulo. Las keys sensibles se muestran enmascaradas.
            </p>
          </div>

          {configMsg && (
            <p className={`text-sm ${configMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {configMsg}
            </p>
          )}

          {/* Modal de edicion */}
          {editingConfig && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Editar: {editingConfig.key}</h3>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={editingConfig.value}
                  onChange={e => setEditingConfig({ ...editingConfig, value: e.target.value })}
                  placeholder="Nuevo valor..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={saveConfig}
                  disabled={configsLoading || !editingConfig.value.trim()}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingConfig(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de configuraciones */}
          {configsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full" style={{ borderColor: "#5DE1E5" }}></div>
            </div>
          ) : moduleConfigs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay configuraciones</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Key</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Valor</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Estado</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {moduleConfigs.map(cfg => (
                    <tr key={cfg.key} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-800">{cfg.key}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {cfg.is_sensitive ? (
                          <span className="text-gray-400">{cfg.value_masked || '(vacio)'}</span>
                        ) : (
                          <span className="max-w-xs truncate block">{cfg.value_masked || '(vacio)'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {cfg.has_value ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Configurado</span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Sin valor</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {cfg.is_sensitive && cfg.has_value && (
                          <button
                            onClick={() => testConfig(cfg.key)}
                            disabled={testingKey === cfg.key}
                            className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {testingKey === cfg.key ? 'Probando...' : 'Probar'}
                          </button>
                        )}
                        {cfg.is_editable && (
                          <button
                            onClick={() => setEditingConfig({ key: cfg.key, value: '' })}
                            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Flujo y Documentacion */}
      {activeTab === 'flujo' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Sincronizador Leads Meta SUVI</h2>
            <p className="text-sm text-gray-500">
              Pipeline automatizado que procesa leads provenientes de formularios nativos de Meta (Facebook Lead Ads). Cuando un usuario completa un formulario dentro de una campaña de Meta, Facebook envía el evento vía webhook. El sistema lo captura, extrae los datos del formulario, los enriquece con IA y los sincroniza en Salesforce CRM.
            </p>
          </div>

          {/* Flujo paso a paso */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Flujo de procesamiento</p>
            <div className="space-y-3">
              {[
                { paso: '00', titulo: 'Verificacion de formulario bloqueado', desc: 'Antes de guardar cualquier registro, se verifica si el form_id está en la lista blocked_form_ids de la config. Si está bloqueado, el lead se descarta silenciosamente: no se guarda en BD ni se procesa.' },
                { paso: '01', titulo: 'Webhook recibido',          desc: 'Facebook envía el evento a /api/webhooks/facebook-leads. Se guarda el lead con estado recibido y se inicia el pipeline.' },
                { paso: '02', titulo: 'Consulta a Facebook',       desc: 'Se llama a Graph API con el leadgen_id para obtener los datos completos del formulario (nombre, teléfono, email, campaña).' },
                { paso: '03', titulo: 'Limpieza de datos',         desc: 'Se normalizan los campos del lead: nombres, teléfonos con código de país, emails. Se guarda en facebook_cleaned_data.' },
                { paso: '04', titulo: 'Enriquecimiento con IA',    desc: 'GPT-4 estructura los datos: nombre completo, detección de país, inferencia del servicio de interés. Se guarda en ai_enriched_data.' },
                { paso: '05', titulo: 'Clasificación de campaña',  desc: 'Se determina el tipo de campaña comparando campaign_name contra dos listas en config. Si está en suvi_campaigns (ej: "Grupo 2 Familia", "Retiro-Julio") → Pauta Interna. Si está en agency_campaigns (ej: "E3D Grupo 3 Inversionistas") → Pauta Agencia. Excepción fija: form_id 1200513015221690 siempre es Pauta Interna. Si no aparece en ninguna lista → Pauta Agencia por defecto. El tipo define el RecordTypeId de la oportunidad en Salesforce (ID: 0124W000000OiIrQAK configurado en salesforce_opportunity_type_id).' },
                { paso: '06', titulo: 'Cuenta en Salesforce',         desc: 'UPSERT de Account usando Correo_Electrónico__c como External ID. Si existe, actualiza; si no, crea. Campos: Name, Phone, AccountSource (tipo de campaña), prefijos telefónicos.' },
                { paso: '07', titulo: 'Ruleta de asesores',            desc: "Se consulta Salesforce: GET /services/data/v60.0/query?q=SELECT+UserOrGroupId+FROM+GroupMember+WHERE+GroupId='00G4W000006rHIN'. Retorna todos los UserOrGroupId del grupo. Se elige uno al azar con Math.random() para asignarle tanto la cuenta como la oportunidad." },
                { paso: '08', titulo: 'Actualizar dueño de la cuenta', desc: 'Se actualiza el campo OwnerId de la Account en Salesforce con el asesor seleccionado en la ruleta. Esto asegura que cuenta y oportunidad queden asignadas al mismo asesor.' },
                { paso: '09', titulo: 'Oportunidad en Salesforce',     desc: 'Se busca si ya existe una Opportunity para la misma cuenta + proyecto + mes actual. Si existe, se actualiza; si no, se crea. Campos: StageName = "Nuevo", OwnerId = asesor de la ruleta, Proyecto__c = uno de los 15 IDs válidos (valid_project_ids), RecordTypeId = 0124W000000OiIrQAK (omitido si falla validación cruzada). CloseDate = hoy + 30 días. Description = info de campaña + resumen IA.' },
                { paso: '10', titulo: 'Completado',                    desc: 'El lead queda en estado completado con salesforce_account_name y salesforce_opportunity_id registrados.' },
                { paso: '11', titulo: 'Error',                         desc: 'Si falla cualquier paso, se guarda el estado error con error_message y error_step para diagnóstico y reprocesamiento manual.' },
              ].map(({ paso, titulo, desc }) => (
                <div key={paso} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">{paso}</span>
                  </div>
                  <div className="flex-1 pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-sm font-semibold text-gray-800">{titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rutas del módulo */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rutas del módulo</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`app/api/webhooks/facebook-leads/route.ts
  POST  /api/webhooks/facebook-leads                              Recibe eventos de Facebook Lead Ads
  GET   /api/webhooks/facebook-leads                              Verificación del webhook (hub.verify_token)

app/api/custom-module1/log-leads-suvi/
  GET   /api/custom-module1/log-leads-suvi                        Lista de leads con filtros y paginación
  GET   /api/custom-module1/log-leads-suvi/[id]                   Detalle de un lead
  POST  /api/custom-module1/log-leads-suvi/[id]/consult-meta      Reconsulta datos en Meta Graph API
  POST  /api/custom-module1/log-leads-suvi/reprocess-from-cleaned Reprocesa IA desde datos limpios
  POST  /api/custom-module1/log-leads-suvi/process-salesforce     Envía lead a Salesforce
  GET   /api/custom-module1/log-leads-suvi/incomplete             Lista leads incompletos para batch
  POST  /api/custom-module1/log-leads-suvi/reprocess              Reprocesa un lead desde cero

app/api/custom-module1/log-leads-suvi/config/
  GET   /api/custom-module1/log-leads-suvi/config                 Lista blocked_form_ids
  GET   /api/custom-module1/log-leads-suvi/config?all=true        Lista todas las configs (enmascaradas)
  PUT   /api/custom-module1/log-leads-suvi/config                 Actualiza blocked_form_ids
  POST  /api/custom-module1/log-leads-suvi/config                 Actualiza config individual (editables)
  POST  /api/custom-module1/log-leads-suvi/config/test            Prueba validez de API key

app/api/oauth/salesforce/
  GET   /api/oauth/salesforce/authorize                           Inicia flujo OAuth con Salesforce
  GET   /api/oauth/salesforce/status                              Estado del token (activo / tiempo restante)

utils/modulos/suvi-leads/
  orchestrator.ts   Coordinador principal del pipeline (paso a paso)
  processors.ts     Lógica de Facebook, IA y clasificación de campaña
  salesforce.ts     Llamadas a Salesforce REST API (account UPSERT, opportunity)
  config.ts         Funciones getConfig() y setConfig() para modulos_suvi_12_config`}
            </pre>
          </div>

          {/* Tablas */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tablas en base de datos</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`modulos_suvi_12_leads
  id                         INT (PK)
  leadgen_id                 VARCHAR(100)   ID único del lead en Facebook
  page_id / form_id          VARCHAR(100)   Página y formulario de origen
  campaign_name / ad_name    VARCHAR(255)   Campaña y anuncio
  campaign_type              ENUM           Interna | Agencia
  processing_status          VARCHAR(50)    Estado actual del pipeline
  current_step               VARCHAR(100)   Paso en ejecución
  error_message / error_step TEXT           Diagnóstico de errores
  facebook_raw_data          JSON           Respuesta cruda de Graph API
  facebook_cleaned_data      JSON           Datos normalizados
  ai_enriched_data           JSON           Datos enriquecidos por GPT-4
  salesforce_account_name    VARCHAR(255)   Cuenta creada/actualizada en SF
  salesforce_opportunity_id  VARCHAR(100)   Oportunidad en Salesforce
  received_at / completed_at DATETIME       Tiempos del pipeline
  processing_time_seconds    INT            Duración total

modulos_suvi_12_config
  config_key    VARCHAR(100)   Clave de configuración (PK)
  config_value  TEXT           Valor (puede ser JSON para arrays)
  is_encrypted  BOOLEAN        Indica si el valor está encriptado

  Keys disponibles:
  - openai_api_key            API Key de OpenAI (editable, sensible)
  - facebook_access_token     Token de Facebook Graph API (editable, sensible)
  - facebook_app_id           App ID de Facebook
  - facebook_app_secret       App Secret de Facebook
  - salesforce_consumer_key   Client ID OAuth (editable, sensible)
  - salesforce_consumer_secret Client Secret OAuth (editable, sensible)
  - salesforce_access_token   Token activo (manejado por OAuth)
  - salesforce_refresh_token  Refresh token (manejado por OAuth)
  - salesforce_instance_url   URL de Salesforce
  - salesforce_token_expiry   Expiración del token
  - salesforce_group_id       ID del grupo de asesores para ruleta
  - salesforce_opportunity_type_id  RecordTypeId para oportunidades
  - agency_campaigns          JSON array de campañas de agencia
  - suvi_campaigns            JSON array de campañas internas
  - valid_project_ids         JSON array de proyectos válidos
  - blocked_form_ids          JSON array de formularios bloqueados`}
            </pre>
          </div>

          {/* Integraciones */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Integraciones externas</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { nombre: 'Facebook Graph API', uso: 'Verificación de webhook y consulta de datos del lead por leadgen_id', auth: 'App Secret + Access Token' },
                { nombre: 'OpenAI GPT-4',       uso: 'Estructuración de datos: nombre completo, país, servicio de interés', auth: 'API Key' },
                { nombre: 'Salesforce REST API', uso: 'UPSERT de Account por email, creación de Opportunity con propietario aleatorio', auth: 'OAuth 2.0 (refresh token)' },
              ].map(({ nombre, uso, auth }) => (
                <div key={nombre} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-1">{nombre}</p>
                  <p className="text-xs text-gray-500 mb-2">{uso}</p>
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">{auth}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { meilisearchAPI, Index } from '@/utils/meilisearch';
import { n8nAPI, Workflow } from '@/utils/n8n';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';
import AgentSelector from '@/components/ui/AgentSelector';
import { PhotoIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { isValidToken } from '@/utils/encryption';

interface Client {
  id: number;
  name: string;
  email?: string;
  company?: string;
}

interface AgentDB {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  photo?: string;
  email?: string;
  phone?: string;
  agent_code?: string;
  status?: string;
  knowledge?: any;
  workflows?: any;
  conversation_agent_name?: string;
  reports_agent_name?: string;
  whatsapp_business_account_id?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
  whatsapp_webhook_verify_token?: string;
  whatsapp_app_secret?: string;
}

export default function EditarAgente() {
  const router = useRouter();
  const params = useParams();
  const [clients, setClients] = useState<Client[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photo: '',
    client_id: 0,
    whatsapp_business_account_id: '',
    whatsapp_phone_number_id: '',
    whatsapp_access_token: '',
    whatsapp_webhook_verify_token: '',
    whatsapp_app_secret: ''
  });
  // Guardar los primeros caracteres del token original para mostrar
  const [tokenPrefix, setTokenPrefix] = useState<{ access_token?: string; webhook_token?: string; app_secret?: string }>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableIndexes, setAvailableIndexes] = useState<Index[]>([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<string[]>([]);
  const [currentAgent, setCurrentAgent] = useState<AgentDB | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableWorkflows, setAvailableWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [workflowSearchQuery, setWorkflowSearchQuery] = useState('');
  const [availableConversationAgents, setAvailableConversationAgents] = useState<string[]>([]);
  const [loadingConversationAgents, setLoadingConversationAgents] = useState(false);
  const [selectedConversationAgent, setSelectedConversationAgent] = useState<string>('');
  const [availableReportAgents, setAvailableReportAgents] = useState<string[]>([]);
  const [loadingReportAgents, setLoadingReportAgents] = useState(false);
  const [selectedReportAgent, setSelectedReportAgent] = useState<string>('');
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });
  const [verifyingWhatsApp, setVerifyingWhatsApp] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);
  const [showTokenUpdateConfirm, setShowTokenUpdateConfirm] = useState(false);
  const [pendingTokenUpdate, setPendingTokenUpdate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'whatsapp' | 'conocimiento' | 'flujos' | 'identificadores'>('general');

  useEffect(() => {
    // Cargar clientes desde MySQL
    const loadClients = async () => {
      try {
        const res = await fetch('/api/clients');
        const data = await res.json();
        if (data.ok && data.clients) {
          setClients(data.clients);
        }
      } catch (err) {
        console.error('Error cargando clientes:', err);
      }
    };
    
    loadClients();
  }, []);

  useEffect(() => {
    const loadAgent = async () => {
      try {
        const res = await fetch(`/api/agents/${params.id}`);
        const data = await res.json();
        if (data.ok && data.agent) {
          const agent: AgentDB = data.agent;
          setCurrentAgent(agent);
          // Si el token está enmascarado (termina en "..."), no mostrar nada en el campo
          // Guardar los primeros caracteres si están disponibles
          const accessToken = agent.whatsapp_access_token || '';
          const webhookToken = agent.whatsapp_webhook_verify_token || '';
          const appSecret = agent.whatsapp_app_secret || '';
          
          setTokenPrefix({
            access_token: accessToken.endsWith('...') ? accessToken.substring(0, 4) : (accessToken.length > 0 ? accessToken.substring(0, 4) : undefined),
            webhook_token: webhookToken.endsWith('...') ? webhookToken.substring(0, 4) : (webhookToken.length > 0 ? webhookToken.substring(0, 4) : undefined),
            app_secret: appSecret.endsWith('...') ? appSecret.substring(0, 4) : (appSecret.length > 0 ? appSecret.substring(0, 4) : undefined)
          });
          
          setFormData({
            name: agent.name,
            description: agent.description || '',
            photo: agent.photo || '',
            client_id: agent.client_id,
            whatsapp_business_account_id: agent.whatsapp_business_account_id || '',
            whatsapp_phone_number_id: agent.whatsapp_phone_number_id || '',
            // Si está enmascarado, dejar vacío para que el usuario pueda ingresar uno nuevo
            whatsapp_access_token: accessToken.endsWith('...') ? '' : accessToken,
            whatsapp_webhook_verify_token: webhookToken.endsWith('...') ? '' : webhookToken,
            whatsapp_app_secret: appSecret.endsWith('...') ? '' : appSecret
          });
          try {
            const k = typeof agent.knowledge === 'string' ? JSON.parse(agent.knowledge) : (agent.knowledge || {});
            setSelectedIndexes(k.indexes || []);
          } catch {
            setSelectedIndexes([]);
          }
          try {
            const w = typeof agent.workflows === 'string' ? JSON.parse(agent.workflows) : (agent.workflows || {});
            setSelectedWorkflows(w.workflowIds || []);
          } catch {
            setSelectedWorkflows([]);
          }
          setSelectedConversationAgent(agent.conversation_agent_name || '');
          setSelectedReportAgent(agent.reports_agent_name || '');
        } else {
          router.push('/agentes');
        }
      } catch (err) {
        console.error('Error cargando agente:', err);
        router.push('/agentes');
      }
    };
    loadAgent();
  }, [params.id, router]);

  useEffect(() => {
    loadIndexes();
    loadWorkflows();
    loadConversationAgents();
    loadReportAgents();
  }, []);

  // Recargar valores seleccionados cuando los datos estén disponibles
  useEffect(() => {
    if (currentAgent && availableIndexes.length > 0) {
      try {
        const k = typeof currentAgent.knowledge === 'string' ? JSON.parse(currentAgent.knowledge) : (currentAgent.knowledge || {});
        const savedIndexes = k.indexes || [];
        // Solo actualizar si hay diferencias para evitar loops infinitos
        const currentSorted = [...selectedIndexes].sort();
        const savedSorted = [...savedIndexes].sort();
        if (JSON.stringify(currentSorted) !== JSON.stringify(savedSorted)) {
          setSelectedIndexes(savedIndexes);
        }
      } catch {
        // Ignorar errores de parsing
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAgent?.id, availableIndexes.length]);

  useEffect(() => {
    if (currentAgent && availableWorkflows.length > 0) {
      try {
        const w = typeof currentAgent.workflows === 'string' ? JSON.parse(currentAgent.workflows) : (currentAgent.workflows || {});
        const savedWorkflows = w.workflowIds || [];
        // Solo actualizar si hay diferencias para evitar loops infinitos
        const currentSorted = [...selectedWorkflows].sort();
        const savedSorted = [...savedWorkflows].sort();
        if (JSON.stringify(currentSorted) !== JSON.stringify(savedSorted)) {
          setSelectedWorkflows(savedWorkflows);
        }
      } catch {
        // Ignorar errores de parsing
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAgent?.id, availableWorkflows.length]);

  const loadReportAgents = async () => {
    setLoadingReportAgents(true);
    try {
      const INDEX_UID = 'bd_reports_dworkers';
      const uniqueAgents = new Set<string>();
      let currentOffset = 0;
      const batchLimit = 1000;
      let hasMore = true;

      while (hasMore) {
        const data = await meilisearchAPI.getDocuments(INDEX_UID, batchLimit, currentOffset);
        data.results.forEach((doc: any) => {
          if (doc.agent && typeof doc.agent === 'string') {
            uniqueAgents.add(doc.agent);
          }
        });
        if (data.results.length < batchLimit) {
          hasMore = false;
        } else {
          currentOffset += batchLimit;
        }
      }
      
      const sortedAgents = Array.from(uniqueAgents).sort();
      setAvailableReportAgents(sortedAgents);
    } catch (error) {
      console.error('Error loading report agents:', error);
    } finally {
      setLoadingReportAgents(false);
    }
  };

  const loadConversationAgents = async () => {
    setLoadingConversationAgents(true);
    try {
      const INDEX_UID = 'bd_conversations_dworkers';
      const uniqueAgents = new Set<string>();
      let currentOffset = 0;
      const batchLimit = 1000;
      let hasMore = true;

      while (hasMore) {
        const data = await meilisearchAPI.getDocuments(INDEX_UID, batchLimit, currentOffset);
        data.results.forEach((doc: any) => {
          if (doc.agent && typeof doc.agent === 'string') {
            uniqueAgents.add(doc.agent);
          }
        });
        if (data.results.length < batchLimit) {
          hasMore = false;
        } else {
          currentOffset += batchLimit;
        }
      }
      
      const sortedAgents = Array.from(uniqueAgents).sort();
      setAvailableConversationAgents(sortedAgents);
    } catch (error) {
      console.error('Error loading conversation agents:', error);
    } finally {
      setLoadingConversationAgents(false);
    }
  };

  const loadWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const workflows = await n8nAPI.getWorkflows();
      setAvailableWorkflows(workflows);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const handleToggleWorkflow = (workflowId: string) => {
    setSelectedWorkflows(prev => {
      if (prev.includes(workflowId)) {
        return prev.filter(id => id !== workflowId);
      } else {
        return [...prev, workflowId];
      }
    });
  };

  const loadIndexes = async (forceRefresh = false) => {
    setLoadingIndexes(true);
    try {
      // Forzar recarga agregando timestamp para evitar caché
      const indexes = await meilisearchAPI.getIndexes(forceRefresh ? Date.now() : undefined);
      setAvailableIndexes(indexes);
      console.log('[LOAD INDEXES] Índices cargados:', indexes.length, indexes.map(i => i.uid));
    } catch (error) {
      console.error('Error loading indexes:', error);
    } finally {
      setLoadingIndexes(false);
    }
  };

  const handleRefreshData = async () => {
    setRefreshingData(true);
    try {
      // Recargar todos los datos de Meilisearch y n8n con forceRefresh=true para evitar caché
      await Promise.all([
        loadIndexes(true), // Forzar recarga de índices
        loadWorkflows(),
        loadConversationAgents(),
        loadReportAgents()
      ]);
      setAlertModal({
        isOpen: true,
        title: 'Datos actualizados',
        message: 'Los datos de Meilisearch y n8n se han actualizado correctamente.',
        type: 'success'
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al actualizar los datos. Por favor, intenta nuevamente.',
        type: 'error'
      });
    } finally {
      setRefreshingData(false);
    }
  };

  const submitAgentUpdate = async (dataToSubmit: any) => {
    if (!currentAgent) return;
    
    try {
      // Agregar flag explícito si hay tokens para actualizar
      if (dataToSubmit.whatsapp_access_token || dataToSubmit.whatsapp_webhook_verify_token || dataToSubmit.whatsapp_app_secret) {
        dataToSubmit.update_tokens = true;
      }
      
      const res = await fetch(`/api/agents/${currentAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit)
      });
      
      const data = await res.json();
      console.log('[EDIT AGENT] Response:', data);
      
      if (!data.ok) {
        throw new Error(data.error || 'Error al actualizar');
      }
      
      // Mostrar warning si existe
      if (data.warning) {
        setAlertModal({
          isOpen: true,
          title: 'Advertencia',
          message: data.warning,
          type: 'warning',
        });
        return;
      }
      
      router.push('/agentes');
    } catch (err: any) {
      console.error('[EDIT AGENT] Error:', err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Error al guardar cambios',
        type: 'error',
      });
    }
  };

  const handleVerifyWhatsApp = async () => {
    if (!currentAgent?.id) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo obtener el ID del agente',
        type: 'error',
      });
      return;
    }

    setVerifyingWhatsApp(true);
    try {
      const response = await fetch(`/api/whatsapp/verify-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_account_id: formData.whatsapp_business_account_id || undefined,
          phone_number_id: formData.whatsapp_phone_number_id || undefined,
          access_token: formData.whatsapp_access_token || undefined,
          agent_id: currentAgent.id // Siempre enviar ID del agente para buscar datos en BD
        })
      });

      const data = await response.json();
      
      if (data.ok) {
        // Determinar el tipo basado en el status del servidor si está disponible
        const alertType = data.status === 'warning' ? 'warning' : 'success';
        setAlertModal({
          isOpen: true,
          title: 'Conexión Exitosa',
          message: data.message || 'La conexión con WhatsApp Business API es correcta. Los datos están funcionando.',
          type: alertType,
        });
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error de Conexión',
          message: data.error || 'No se pudo verificar la conexión. Revisa los datos proporcionados.',
          type: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error verificando WhatsApp:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al verificar la conexión: ' + (error.message || 'Error desconocido'),
        type: 'error',
      });
    } finally {
      setVerifyingWhatsApp(false);
    }
  };

  const handleToggleIndex = (indexId: string) => {
    setSelectedIndexes(prev => {
      if (prev.includes(indexId)) {
        return prev.filter(id => id !== indexId);
      } else {
        return [...prev, indexId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgent) return;
    try {
      console.log('[EDIT AGENT] Submitting with reports_agent_name:', selectedReportAgent);
      
      // Construir el objeto de datos, excluyendo campos undefined
      const requestData: any = {
        client_id: formData.client_id,
        name: formData.name,
        description: formData.description,
        photo: formData.photo,
        knowledge: { indexes: selectedIndexes },
        workflows: { workflowIds: selectedWorkflows },
        conversation_agent_name: selectedConversationAgent || null,
        reports_agent_name: selectedReportAgent || null,
        whatsapp_business_account_id: formData.whatsapp_business_account_id || null,
        whatsapp_phone_number_id: formData.whatsapp_phone_number_id || null,
      };
      
      // CRÍTICO: Validar y preparar tokens para actualización
      // Solo incluir tokens si tienen un valor nuevo válido (no vacío, no enmascarado, longitud mínima)
      const tokensToUpdate: string[] = [];
      const MIN_TOKEN_LENGTH = 20;
      
      if (isValidToken(formData.whatsapp_access_token, MIN_TOKEN_LENGTH)) {
        requestData.whatsapp_access_token = formData.whatsapp_access_token;
        tokensToUpdate.push('Access Token');
      }
      if (isValidToken(formData.whatsapp_webhook_verify_token, MIN_TOKEN_LENGTH)) {
        requestData.whatsapp_webhook_verify_token = formData.whatsapp_webhook_verify_token;
        tokensToUpdate.push('Webhook Verify Token');
      }
      if (isValidToken(formData.whatsapp_app_secret, MIN_TOKEN_LENGTH)) {
        requestData.whatsapp_app_secret = formData.whatsapp_app_secret;
        tokensToUpdate.push('App Secret');
      }
      
      // Si hay tokens para actualizar, requerir confirmación explícita
      if (tokensToUpdate.length > 0) {
        // Guardar los datos pendientes y mostrar confirmación
        setPendingTokenUpdate({ requestData, tokensToUpdate });
        setShowTokenUpdateConfirm(true);
        return; // No continuar hasta que el usuario confirme
      }
      
      // Filtrar campos undefined antes de enviar
      const filteredData = Object.fromEntries(
        Object.entries(requestData).filter(([_, value]) => value !== undefined)
      );
      
      console.log('[EDIT AGENT] Request data (filtered):', filteredData);
      console.log('[EDIT AGENT] Tokens included:', {
        whatsapp_access_token: filteredData.whatsapp_access_token ? 'YES' : 'NO',
        whatsapp_webhook_verify_token: filteredData.whatsapp_webhook_verify_token ? 'YES' : 'NO',
        whatsapp_app_secret: filteredData.whatsapp_app_secret ? 'YES' : 'NO'
      });
      
      await submitAgentUpdate(filteredData);
    } catch (err: any) {
      console.error('[EDIT AGENT] Error:', err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Error al guardar cambios',
        type: 'error',
      });
    }
  };

  const handleConfirmTokenUpdate = async () => {
    if (!pendingTokenUpdate) return;
    
    // Filtrar campos undefined antes de enviar
    const filteredData = Object.fromEntries(
      Object.entries(pendingTokenUpdate.requestData).filter(([_, value]) => value !== undefined)
    );
    
    setShowTokenUpdateConfirm(false);
    await submitAgentUpdate(filteredData);
    setPendingTokenUpdate(null);
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 1 * 1024 * 1024) {
      setAlertModal({
        isOpen: true,
        title: 'Validación',
        message: 'La imagen no puede ser mayor a 1 MB',
        type: 'warning',
      });
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/upload-agent-avatar', {
        method: 'POST',
        body: uploadFormData
      });

      const data = await response.json();

      if (response.ok) {
        setFormData({ ...formData, photo: data.url });
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Error al subir la imagen',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al subir la imagen',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  // Calcular tags del agente basados en configuración
  const agentTags: string[] = [];
  if (formData.whatsapp_access_token || formData.whatsapp_business_account_id || formData.whatsapp_phone_number_id) {
    agentTags.push('WhatsApp');
  }
  if (selectedIndexes.length > 0) {
    agentTags.push('Meilisearch');
  }
  if (selectedWorkflows.length > 0) {
    agentTags.push('n8n');
  }
  if (selectedConversationAgent) {
    agentTags.push('Conversaciones');
  }
  if (selectedReportAgent) {
    agentTags.push('Informes');
  }

  // Obtener nombre del cliente
  const clientName = clients.find(c => c.id === formData.client_id)?.name || 'Sin cliente asignado';

  if (!currentAgent) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full border-[#5DE1E5]"></div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <form onSubmit={handleSubmit}>
        {/* Header de Perfil del Agente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-8">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer relative"
              >
                {formData.photo ? (
                  <div className="relative">
                    <img 
                      src={formData.photo} 
                      alt={formData.name || 'Avatar'} 
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full transition-all flex items-center justify-center">
                      <PhotoIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                    <UserCircleIcon className="w-24 h-24 text-gray-400" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file);
                  }
                }}
              />
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {/* Información Principal */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{formData.name || 'Sin nombre'}</h1>
              
              {/* Tags/Roles */}
              {agentTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {agentTags.map((tag) => (
                    <span 
                      key={tag}
                      className="px-3 py-1 bg-[#5DE1E5] text-gray-900 rounded-full text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Descripción */}
              {formData.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{formData.description}</p>
              )}

              {/* Cliente */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{clientName}</span>
              </div>

              {/* Métricas */}
              <div className="flex gap-6">
                <div className="text-sm">
                  <span className="text-gray-500">Índices:</span>
                  <span className="ml-2 font-semibold text-gray-900">{selectedIndexes.length}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Flujos:</span>
                  <span className="ml-2 font-semibold text-gray-900">{selectedWorkflows.length}</span>
                </div>
              </div>
            </div>

            {/* Acciones Principales */}
            <div className="flex flex-col gap-3 md:items-end flex-shrink-0">
              <button
                type="button"
                onClick={handleVerifyWhatsApp}
                disabled={verifyingWhatsApp}
                className="rounded-md bg-[#5DE1E5] px-4 py-2 text-sm font-semibold text-gray-900 shadow-xs hover:bg-[#4BC5C9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5DE1E5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {verifyingWhatsApp ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-gray-900 border-t-transparent rounded-full"></div>
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Verificar Conexión</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleRefreshData}
                disabled={refreshingData}
                className="rounded-md bg-[#5DE1E5] px-4 py-2 text-sm font-semibold text-gray-900 shadow-xs hover:bg-[#4BC5C9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5DE1E5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshingData ? 'animate-spin' : ''}`} />
                <span>{refreshingData ? 'Actualizando...' : 'Actualizar Datos'}</span>
              </button>

              <button
                type="submit"
                className="rounded-md bg-[#5DE1E5] px-4 py-2 text-sm font-semibold text-gray-900 shadow-xs hover:bg-[#4BC5C9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5DE1E5] whitespace-nowrap"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>

        {/* Tabs de Navegación */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'general'
                    ? 'border-[#5DE1E5] text-[#5DE1E5]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Información General
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'whatsapp'
                    ? 'border-[#5DE1E5] text-[#5DE1E5]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('conocimiento')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'conocimiento'
                    ? 'border-[#5DE1E5] text-[#5DE1E5]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Conocimiento
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('flujos')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'flujos'
                    ? 'border-[#5DE1E5] text-[#5DE1E5]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Flujos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('identificadores')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'identificadores'
                    ? 'border-[#5DE1E5] text-[#5DE1E5]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Identificadores
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de Tabs */}
        <div className="space-y-6">
          {/* Tab: Información General */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 pb-12">
            <h2 className="text-base/7 font-semibold text-gray-900">Información General</h2>
            <p className="mt-1 text-sm/6 text-gray-600">
              Información básica del agente que será visible en el sistema.
            </p>
            
            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="name" className="block text-sm/6 font-medium text-gray-900">
                  Nombre *
                </label>
                <div className="mt-2">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="client_id" className="block text-sm/6 font-medium text-gray-900">
                  Cliente *
                </label>
                <div className="mt-2 grid grid-cols-1">
                  <select
                    id="client_id"
                    name="client_id"
                    required
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) })}
                    className="col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                  >
                    <option value={0}>Seleccionar cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                  />
                </div>
              </div>

              <div className="sm:col-span-full">
                <label htmlFor="description" className="block text-sm/6 font-medium text-gray-900">
                  Descripción
                </label>
                  <div className="mt-2">
                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    placeholder="Descripción del agente y su propósito..."
                  />
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Tab: Identificadores */}
          {activeTab === 'identificadores' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 pb-12">
            <h2 className="text-base/7 font-semibold text-gray-900">Identificadores</h2>
            <p className="mt-1 text-sm/6 text-gray-600">
              Configura los identificadores para asociar conversaciones e informes con este agente.
            </p>
            
            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="conversation_agent_name" className="block text-sm/6 font-medium text-gray-900">
                  Agente para Conversaciones
                </label>
                <div className="mt-2 grid grid-cols-1">
                  {loadingConversationAgents ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-transparent rounded-full"></div>
                      <p className="text-sm">Cargando...</p>
                    </div>
                  ) : (
                    <>
                <select
                        id="conversation_agent_name"
                        name="conversation_agent_name"
                  value={selectedConversationAgent}
                  onChange={(e) => setSelectedConversationAgent(e.target.value)}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                >
                        <option value="">Seleccionar agente...</option>
                  {availableConversationAgents.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
                </select>
                      <ChevronDownIcon
                        aria-hidden="true"
                        className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                      />
                    </>
                )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="reports_agent_name" className="block text-sm/6 font-medium text-gray-900">
                  Agente para Informes
                </label>
                <div className="mt-2 grid grid-cols-1">
                  {loadingReportAgents ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-transparent rounded-full"></div>
                      <p className="text-sm">Cargando...</p>
                    </div>
                  ) : (
                    <>
                      <select
                        id="reports_agent_name"
                        name="reports_agent_name"
                        value={selectedReportAgent}
                        onChange={(e) => setSelectedReportAgent(e.target.value)}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                      >
                        <option value="">Seleccionar agente...</option>
                        {availableReportAgents.map((agent) => (
                          <option key={agent} value={agent}>
                            {agent}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon
                        aria-hidden="true"
                        className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conocimiento y Flujos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex-1">
                <h2 className="text-base/7 font-semibold text-gray-900">Conocimiento y Flujos</h2>
                <p className="mt-1 text-sm/6 text-gray-600">
                  Configura los índices de conocimiento y los flujos de n8n disponibles para este agente.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefreshData}
                disabled={refreshingData}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-900 bg-[#5DE1E5] border border-transparent rounded-md shadow-sm hover:bg-[#4BC5C9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5DE1E5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <ArrowPathIcon 
                  className={`h-5 w-5 ${refreshingData ? 'animate-spin' : ''}`} 
                />
                <span>{refreshingData ? 'Actualizando...' : 'Actualizar Datos'}</span>
              </button>
            </div>
            
            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-2">
          {/* Configuración de Conocimiento */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Conocimiento del Agente</h3>
            
            {loadingIndexes ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona los índices de Meilisearch que este agente puede consultar:
                </p>
                
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Buscar índice..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                  />
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableIndexes
                    .filter((index) => 
                      index.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (index.name && index.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .sort((a, b) => {
                      // Índices seleccionados primero
                      const aSelected = selectedIndexes.includes(a.uid);
                      const bSelected = selectedIndexes.includes(b.uid);
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      return 0;
                    })
                    .map((index) => (
                    <label
                      key={index.uid}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedIndexes.includes(index.uid)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIndexes.includes(index.uid)}
                        onChange={() => handleToggleIndex(index.uid)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-gray-900">{index.uid}</p>
                        {index.name && (
                          <p className="text-sm text-gray-500">{index.name}</p>
                        )}
                      </div>
                      {index.primaryKey && (
                        <span className="text-xs text-gray-400">{index.primaryKey}</span>
                      )}
                    </label>
                  ))}
                </div>
                
                {availableIndexes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay índices disponibles
                  </div>
                )}

                {selectedIndexes.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Índices seleccionados: {selectedIndexes.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedIndexes.map((indexId) => {
                        const index = availableIndexes.find(i => i.uid === indexId);
                        return (
                          <span key={indexId} className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                            {index?.uid}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Configuración de Flujos n8n */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Flujos n8n del Agente</h3>
            
            {loadingWorkflows ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona los flujos de n8n que este agente puede ejecutar:
                </p>
                
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Buscar flujo..."
                    value={workflowSearchQuery}
                    onChange={(e) => setWorkflowSearchQuery(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                  />
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableWorkflows
                    .filter((workflow) => 
                      workflow.name.toLowerCase().includes(workflowSearchQuery.toLowerCase())
                    )
                    .sort((a, b) => {
                      const aSelected = selectedWorkflows.includes(a.id);
                      const bSelected = selectedWorkflows.includes(b.id);
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      return 0;
                    })
                    .map((workflow) => (
                    <label
                      key={workflow.id}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedWorkflows.includes(workflow.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedWorkflows.includes(workflow.id)}
                        onChange={() => handleToggleWorkflow(workflow.id)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-gray-900">{workflow.name}</p>
                        <p className="text-sm text-gray-500">ID: {workflow.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {workflow.active && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Activo
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                
                {availableWorkflows.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay flujos disponibles
                  </div>
                )}

                {selectedWorkflows.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      Flujos seleccionados: {selectedWorkflows.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedWorkflows.map((workflowId) => {
                        const workflow = availableWorkflows.find(w => w.id === workflowId);
                        return (
                          <span key={workflowId} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                            {workflow?.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 pb-12">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base/7 font-semibold text-gray-900">WhatsApp Business API</h2>
                <p className="mt-1 text-sm/6 text-gray-600">
                  Configuración para interactuar con la API de Meta WhatsApp Business.
                </p>
              </div>
              <button
                type="button"
                onClick={handleVerifyWhatsApp}
                disabled={verifyingWhatsApp}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {verifyingWhatsApp ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Verificar Conexión</span>
                  </>
                )}
              </button>
          </div>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="whatsapp_business_account_id" className="block text-sm/6 font-medium text-gray-900">
                  Business Account ID
                </label>
                <div className="mt-2">
                  <input
                    id="whatsapp_business_account_id"
                    name="whatsapp_business_account_id"
                    type="text"
                    value={formData.whatsapp_business_account_id}
                    onChange={(e) => setFormData({ ...formData, whatsapp_business_account_id: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="whatsapp_phone_number_id" className="block text-sm/6 font-medium text-gray-900">
                  Phone Number ID
                </label>
                <div className="mt-2">
                  <input
                    id="whatsapp_phone_number_id"
                    name="whatsapp_phone_number_id"
                    type="text"
                    value={formData.whatsapp_phone_number_id}
                    onChange={(e) => setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div className="col-span-full">
                <label htmlFor="whatsapp_access_token" className="block text-sm/6 font-medium text-gray-900">
                  Access Token
                </label>
                <div className="mt-2">
                  <textarea
                    id="whatsapp_access_token"
                    name="whatsapp_access_token"
                    rows={3}
                    value={formData.whatsapp_access_token}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      // Guardar los primeros caracteres del token original
                      if (newValue.length > 0) {
                        setTokenPrefix({ ...tokenPrefix, access_token: newValue.substring(0, 4) });
                      }
                      setFormData({ ...formData, whatsapp_access_token: newValue });
                    }}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    placeholder={tokenPrefix.access_token ? `${tokenPrefix.access_token}... (token guardado)` : "EAA..."}
                  />
                  {tokenPrefix.access_token && !formData.whatsapp_access_token && (
                    <p className="mt-1 text-xs text-gray-500">
                      Token guardado (inicia con: {tokenPrefix.access_token}...). Deja vacío para mantener el actual o ingresa uno nuevo para reemplazarlo.
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="whatsapp_webhook_verify_token" className="block text-sm/6 font-medium text-gray-900">
                  Webhook Verify Token
                </label>
                <div className="mt-2">
                  <input
                    id="whatsapp_webhook_verify_token"
                    name="whatsapp_webhook_verify_token"
                    type="text"
                    value={formData.whatsapp_webhook_verify_token}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      // Guardar los primeros caracteres del token original
                      if (newValue.length > 0) {
                        setTokenPrefix({ ...tokenPrefix, webhook_token: newValue.substring(0, 4) });
                      }
                      setFormData({ ...formData, whatsapp_webhook_verify_token: newValue });
                    }}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    placeholder={tokenPrefix.webhook_token ? `${tokenPrefix.webhook_token}... (token guardado)` : "mi_token_secreto"}
                  />
                  {tokenPrefix.webhook_token && !formData.whatsapp_webhook_verify_token && (
                    <p className="mt-1 text-xs text-gray-500">
                      Token guardado (inicia con: {tokenPrefix.webhook_token}...). Deja vacío para mantener el actual o ingresa uno nuevo para reemplazarlo.
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="whatsapp_app_secret" className="block text-sm/6 font-medium text-gray-900">
                  App Secret
                </label>
                <div className="mt-2">
                  <input
                    id="whatsapp_app_secret"
                    name="whatsapp_app_secret"
                    type="text"
                    value={formData.whatsapp_app_secret}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      // Guardar los primeros caracteres del token original
                      if (newValue.length > 0) {
                        setTokenPrefix({ ...tokenPrefix, app_secret: newValue.substring(0, 4) });
                      }
                      setFormData({ ...formData, whatsapp_app_secret: newValue });
                    }}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    placeholder={tokenPrefix.app_secret ? `${tokenPrefix.app_secret}... (token guardado)` : "abc123..."}
                  />
                  {tokenPrefix.app_secret && !formData.whatsapp_app_secret && (
                    <p className="mt-1 text-xs text-gray-500">
                      Token guardado (inicia con: {tokenPrefix.app_secret}...). Deja vacío para mantener el actual o ingresa uno nuevo para reemplazarlo.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>

        <div className="mt-6 flex items-center justify-end gap-x-6">
            <button
              type="button"
              onClick={() => router.push('/agentes')}
            className="text-sm/6 font-semibold text-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
            className="rounded-md bg-[#5DE1E5] px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs hover:bg-[#4BC5C9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5DE1E5]"
            >
            Guardar
            </button>
          </div>
        </form>

        {/* Modal de confirmación para actualizar tokens */}
        {showTokenUpdateConfirm && pendingTokenUpdate && (
          <NoticeModal
            isOpen={showTokenUpdateConfirm}
            onClose={() => {
              setShowTokenUpdateConfirm(false);
              setPendingTokenUpdate(null);
            }}
            title="Confirmar Actualización de Tokens"
            message={`Estás a punto de actualizar los siguientes tokens de WhatsApp:\n\n${pendingTokenUpdate.tokensToUpdate.join('\n')}\n\n⚠️ ADVERTENCIA: Esta acción reemplazará los tokens actuales. Asegúrate de que los nuevos tokens sean correctos.\n\n¿Deseas continuar?`}
            type="warning"
            showCancel={true}
            onConfirm={handleConfirmTokenUpdate}
          />
        )}

        {/* Modal de alertas */}
        <NoticeModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
        />
      </ProtectedLayout>
    );
  }


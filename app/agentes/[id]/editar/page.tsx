'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { meilisearchAPI, Index } from '@/utils/meilisearch';
import { n8nAPI, Workflow } from '@/utils/n8n';
import ProtectedLayout from '@/components/ProtectedLayout';
import AlertModal from '@/components/ui/AlertModal';
import AgentSelector from '@/components/ui/AgentSelector';
import { PhotoIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { ChevronDownIcon } from '@heroicons/react/16/solid';

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
          setFormData({
            name: agent.name,
            description: agent.description || '',
            photo: agent.photo || '',
            client_id: agent.client_id,
            whatsapp_business_account_id: agent.whatsapp_business_account_id || '',
            whatsapp_phone_number_id: agent.whatsapp_phone_number_id || '',
            whatsapp_access_token: agent.whatsapp_access_token || '',
            whatsapp_webhook_verify_token: agent.whatsapp_webhook_verify_token || '',
            whatsapp_app_secret: agent.whatsapp_app_secret || ''
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

  const loadIndexes = async () => {
    setLoadingIndexes(true);
    try {
      const indexes = await meilisearchAPI.getIndexes();
      setAvailableIndexes(indexes);
    } catch (error) {
      console.error('Error loading indexes:', error);
    } finally {
      setLoadingIndexes(false);
    }
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

  const handleVerifyWhatsApp = async () => {
    if (!formData.whatsapp_business_account_id || !formData.whatsapp_phone_number_id || !formData.whatsapp_access_token) {
      setAlertModal({
        isOpen: true,
        title: 'Validación',
        message: 'Por favor completa Business Account ID, Phone Number ID y Access Token para verificar la conexión',
        type: 'warning',
      });
      return;
    }

    setVerifyingWhatsApp(true);
    try {
      const response = await fetch(`/api/whatsapp/verify-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_account_id: formData.whatsapp_business_account_id,
          phone_number_id: formData.whatsapp_phone_number_id,
          access_token: formData.whatsapp_access_token
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
      const res = await fetch(`/api/agents/${currentAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          whatsapp_access_token: formData.whatsapp_access_token || null,
          whatsapp_webhook_verify_token: formData.whatsapp_webhook_verify_token || null,
          whatsapp_app_secret: formData.whatsapp_app_secret || null
        })
      });
      const data = await res.json();
      console.log('[EDIT AGENT] Response:', data);
      if (!data.ok) throw new Error(data.error || 'Error al actualizar');
      
      // Mostrar warning si existe
      if (data.warning) {
        setAlertModal({
          isOpen: true,
          title: 'Advertencia',
          message: data.warning,
          type: 'warning',
        });
        // No redirigir si hay warning, para que el usuario pueda ver el mensaje
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Agente</h1>
        <p className="mt-2 text-gray-600">Actualiza la información del agente y configura su conocimiento</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-16">
          {/* Información del Agente */}
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

              <div className="sm:col-span-4">
                <label htmlFor="description" className="block text-sm/6 font-medium text-gray-900">
                  Descripción
                </label>
                <div className="mt-2">
                  <textarea
                    id="description"
                    name="description"
                    rows={8}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    style={{ height: '152px' }}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="photo" className="block text-sm/6 font-medium text-gray-900">
                  Foto
                </label>
                <div className="mt-2 flex flex-col gap-3" style={{ height: '152px' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative">
                      {formData.photo ? (
                        <div className="bg-white rounded-lg border-2 border-gray-200 shadow-sm p-2">
                          <img src={formData.photo} alt="Avatar" className="size-32 rounded-full object-cover" />
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg border-2 border-gray-200 shadow-sm p-2">
                          <UserCircleIcon aria-hidden="true" className="size-32 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] h-fit"
                    >
                      {uploading ? 'Subiendo...' : formData.photo ? 'Cambiar' : 'Subir'}
                    </button>
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
                </div>
              </div>
            </div>
          </div>

          {/* Identificadores */}
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
            <h2 className="text-base/7 font-semibold text-gray-900">Conocimiento y Flujos</h2>
            <p className="mt-1 text-sm/6 text-gray-600">
              Configura los índices de conocimiento y los flujos de n8n disponibles para este agente.
            </p>
            
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
                disabled={verifyingWhatsApp || !formData.whatsapp_business_account_id || !formData.whatsapp_phone_number_id || !formData.whatsapp_access_token}
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
                    onChange={(e) => setFormData({ ...formData, whatsapp_access_token: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    placeholder="EAA..."
                  />
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
                    onChange={(e) => setFormData({ ...formData, whatsapp_webhook_verify_token: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    placeholder="mi_token_secreto"
                  />
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
                    onChange={(e) => setFormData({ ...formData, whatsapp_app_secret: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    placeholder="abc123..."
                  />
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

        {/* Modal de alertas */}
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
        />
    </ProtectedLayout>
  );
}


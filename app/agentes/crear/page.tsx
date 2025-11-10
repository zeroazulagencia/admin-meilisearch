'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { meilisearchAPI, Index } from '@/utils/meilisearch';
import { n8nAPI, Workflow } from '@/utils/n8n';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';
import { PhotoIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import { ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface Client {
  id: number;
  name: string;
  email?: string;
  company?: string;
}

export default function CrearAgente() {
  const router = useRouter();
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
  const [activeTab, setActiveTab] = useState<'general' | 'whatsapp' | 'conocimiento' | 'flujos' | 'identificadores'>('general');
  const [saving, setSaving] = useState(false);
  const [showAIImageModal, setShowAIImageModal] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);

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
    loadIndexes();
    loadWorkflows();
    loadConversationAgents();
    loadReportAgents();
  }, []);

  const loadIndexes = async (forceRefresh = false) => {
    setLoadingIndexes(true);
    try {
      const timestamp = forceRefresh ? Date.now() : undefined;
      const indexes = await meilisearchAPI.getIndexes(timestamp);
      setAvailableIndexes(indexes);
    } catch (error) {
      console.error('Error cargando índices:', error);
    } finally {
      setLoadingIndexes(false);
    }
  };

  const loadWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const workflows = await n8nAPI.getWorkflows();
      setAvailableWorkflows(workflows);
    } catch (error) {
      console.error('Error cargando workflows:', error);
    } finally {
      setLoadingWorkflows(false);
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

  const handleRefreshData = async () => {
    setRefreshingData(true);
    try {
      await Promise.all([
        loadIndexes(true),
        loadWorkflows(),
        loadConversationAgents(),
        loadReportAgents()
      ]);
    } catch (error) {
      console.error('Error actualizando datos:', error);
    } finally {
      setRefreshingData(false);
    }
  };

  const handleToggleIndex = (indexUid: string) => {
    setSelectedIndexes(prev => 
      prev.includes(indexUid)
        ? prev.filter(id => id !== indexUid)
        : [...prev, indexUid]
    );
  };

  const handleToggleWorkflow = (workflowId: string) => {
    setSelectedWorkflows(prev => 
      prev.includes(workflowId)
        ? prev.filter(id => id !== workflowId)
        : [...prev, workflowId]
    );
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', 'agents');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();
      if (data.ok && data.url) {
        setFormData({ ...formData, photo: data.url });
      } else {
        throw new Error(data.error || 'Error al subir imagen');
      }
    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Error al subir la imagen',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyWhatsApp = async () => {
    setVerifyingWhatsApp(true);
    try {
      const res = await fetch('/api/whatsapp/verify-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: null,
          access_token: formData.whatsapp_access_token,
          phone_number_id: formData.whatsapp_phone_number_id,
          business_account_id: formData.whatsapp_business_account_id,
        }),
      });

      const data = await res.json();
      const alertType = data.ok ? 'success' : 'error';
      setAlertModal({
        isOpen: true,
        title: data.ok ? 'Conexión Exitosa' : 'Error de Conexión',
        message: data.message || (data.ok ? 'La conexión con WhatsApp Business API es correcta.' : 'Error al verificar la conexión.'),
        type: alertType,
      });
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Error al verificar la conexión',
        type: 'error',
      });
    } finally {
      setVerifyingWhatsApp(false);
    }
  };

  const processImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto del canvas'));
          return;
        }

        // Calcular dimensiones manteniendo aspecto (máximo 800x800)
        let width = img.width;
        let height = img.height;
        const maxSize = 800;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a base64 con compresión (calidad 0.85)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = dataUrl;
    });
  };

  const handleGenerateAIImage = async () => {
    if (!aiImagePrompt.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Por favor ingresa un prompt para generar la imagen',
        type: 'error',
      });
      return;
    }

    setGeneratingImage(true);
    try {
      const res = await fetch('/api/openai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiImagePrompt }),
      });

      const data = await res.json();
      if (data.ok && data.url) {
        // Procesar la imagen: redimensionar y comprimir
        const processedImage = await processImage(data.url);
        setFormData({ ...formData, photo: processedImage });
        setShowAIImageModal(false);
        setAiImagePrompt('');
        setAlertModal({
          isOpen: true,
          title: 'Éxito',
          message: `Imagen generada correctamente usando ${data.model || 'DALL-E 3'}. La imagen ha sido optimizada a máximo 800x800px.`,
          type: 'success',
        });
      } else {
        throw new Error(data.error || 'Error al generar imagen');
      }
    } catch (error: any) {
      console.error('Error generando imagen:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Error al generar la imagen con IA',
        type: 'error',
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const agentData = {
        client_id: formData.client_id,
        name: formData.name,
        description: formData.description || null,
        photo: formData.photo || null,
        knowledge: { indexes: selectedIndexes },
        workflows: { workflowIds: selectedWorkflows },
        conversation_agent_name: selectedConversationAgent || null,
        reports_agent_name: selectedReportAgent || null,
        whatsapp_business_account_id: formData.whatsapp_business_account_id || null,
        whatsapp_phone_number_id: formData.whatsapp_phone_number_id || null,
        whatsapp_access_token: formData.whatsapp_access_token || null,
        whatsapp_webhook_verify_token: formData.whatsapp_webhook_verify_token || null,
        whatsapp_app_secret: formData.whatsapp_app_secret || null,
      };

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });

      const data = await res.json();
      if (data.ok) {
        setAlertModal({
          isOpen: true,
          title: 'Éxito',
          message: 'Agente creado correctamente',
          type: 'success',
        });
        setTimeout(() => {
          router.push(`/agentes/${data.id}/editar`);
        }, 1500);
      } else {
        throw new Error(data.error || 'Error al crear agente');
      }
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Error al crear el agente',
        type: 'error',
      });
    } finally {
      setSaving(false);
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

  return (
    <ProtectedLayout>
      <form onSubmit={handleSubmit}>
        {/* Header de Perfil del Agente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-8">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="relative group">
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
              <button
                type="button"
                onClick={() => setShowAIImageModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-900 bg-[#5DE1E5] rounded-md hover:bg-[#4BC5C9] transition-colors"
                title="Generar avatar con IA"
              >
                <SparklesIcon className="w-4 h-4" />
                <span>Generar con IA</span>
              </button>
            </div>

            {/* Información Principal */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {formData.name || 'Nuevo Agente'}
              </h1>
              
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

              <p className="text-gray-600 mb-4 break-words overflow-wrap-anywhere">
                {formData.description || 'Sin descripción'}
              </p>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="font-medium">Cliente:</span>
                <span>{clientName}</span>
              </div>

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

            {/* Botones de Acción */}
            <div className="flex flex-col gap-3 md:items-end flex-shrink-0">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-[#5DE1E5] px-4 py-2 text-sm font-semibold text-gray-900 shadow-xs hover:bg-[#4BC5C9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5DE1E5] whitespace-nowrap"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
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
          )}

          {/* Tab: Conocimiento */}
          {activeTab === 'conocimiento' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 pb-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-base/7 font-semibold text-gray-900">Conocimiento Meilisearch</h2>
                  <p className="mt-1 text-sm/6 text-gray-600">
                    Selecciona los índices de conocimiento que este agente puede consultar.
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
              
              <div>
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
            </div>
          )}

          {/* Tab: Flujos */}
          {activeTab === 'flujos' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 pb-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-base/7 font-semibold text-gray-900">Flujos n8n</h2>
                  <p className="mt-1 text-sm/6 text-gray-600">
                    Selecciona los flujos de n8n que este agente puede ejecutar.
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
              
              <div>
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
          )}

          {/* Tab: WhatsApp */}
          {activeTab === 'whatsapp' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 pb-12">
              <div className="flex items-center justify-between mb-6">
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
                  className="rounded-md bg-[#5DE1E5] px-4 py-2 text-sm font-semibold text-gray-900 shadow-xs hover:bg-[#4BC5C9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5DE1E5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                      placeholder="ID de la cuenta de negocio"
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
                      placeholder="ID del número de teléfono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="whatsapp_access_token" className="block text-sm/6 font-medium text-gray-900">
                    Access Token
                  </label>
                  <div className="mt-2">
                    <input
                      id="whatsapp_access_token"
                      name="whatsapp_access_token"
                      type="text"
                      value={formData.whatsapp_access_token}
                      onChange={(e) => setFormData({ ...formData, whatsapp_access_token: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                      placeholder="Token de acceso de WhatsApp"
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
                      placeholder="Token de verificación del webhook"
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
                      placeholder="Secreto de la aplicación"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción Finales */}
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
            disabled={saving}
            className="rounded-md bg-[#5DE1E5] px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs hover:bg-[#4BC5C9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5DE1E5] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>

      {/* Modal de alertas */}
      <NoticeModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Modal para generar imagen con IA */}
      {showAIImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generar Avatar con IA</h3>
            <p className="text-sm text-gray-600 mb-4">
              Describe cómo quieres que se vea el avatar del agente. La IA generará una imagen única usando <strong>DALL-E 3</strong>. La imagen será optimizada automáticamente a máximo 800x800px.
            </p>
            <textarea
              value={aiImagePrompt}
              onChange={(e) => setAiImagePrompt(e.target.value)}
              placeholder="Ejemplo: Un robot amigable con colores azul y verde, estilo moderno y profesional"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] mb-4"
              rows={4}
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAIImageModal(false);
                  setAiImagePrompt('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateAIImage}
                disabled={generatingImage || !aiImagePrompt.trim()}
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-[#5DE1E5] rounded-md hover:bg-[#4BC5C9] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingImage ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-gray-900 border-t-transparent rounded-full"></div>
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Generar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}


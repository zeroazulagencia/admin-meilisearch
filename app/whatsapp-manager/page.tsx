'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import AgentSelector from '@/components/ui/AgentSelector';
import AlertModal from '@/components/ui/AlertModal';
import { useState, useEffect } from 'react';
import { getPermissions, getUserId } from '@/utils/permissions';
import {
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  DocumentIcon,
  RectangleStackIcon,
  CommandLineIcon,
  ListBulletIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  TrashIcon,
  Cog6ToothIcon,
  InboxIcon,
  ArchiveBoxIcon,
  TagIcon,
  FilmIcon,
  PaperAirplaneIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

interface AgentDB {
  id: number;
  client_id?: number;
  name: string;
  description?: string;
  photo?: string;
  whatsapp_business_account_id?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
  whatsapp_webhook_verify_token?: string;
  whatsapp_app_secret?: string;
}

interface WhatsAppAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'mensajes' | 'plantillas' | 'conversaciones' | 'configuracion' | 'informacion';
  color: string;
}

const whatsappActions: WhatsAppAction[] = [
  {
    id: 'send-text',
    title: 'Enviar Mensaje de Texto',
    description: 'Enviar un mensaje de texto simple a un número de WhatsApp',
    icon: ChatBubbleLeftRightIcon,
    category: 'mensajes',
    color: 'bg-blue-500'
  },
  {
    id: 'send-image',
    title: 'Enviar Mensaje con Imagen',
    description: 'Enviar un mensaje con imagen adjunta',
    icon: PhotoIcon,
    category: 'mensajes',
    color: 'bg-green-500'
  },
  {
    id: 'send-document',
    title: 'Enviar Mensaje con Documento',
    description: 'Enviar un documento (PDF, DOC, etc.) a través de WhatsApp',
    icon: DocumentIcon,
    category: 'mensajes',
    color: 'bg-purple-500'
  },
  {
    id: 'send-template',
    title: 'Enviar Mensaje con Plantilla',
    description: 'Enviar un mensaje usando una plantilla preaprobada',
    icon: DocumentTextIcon,
    category: 'plantillas',
    color: 'bg-indigo-500'
  },
  {
    id: 'send-buttons',
    title: 'Enviar Mensaje con Botones',
    description: 'Enviar un mensaje con botones interactivos',
    icon: CommandLineIcon,
    category: 'mensajes',
    color: 'bg-pink-500'
  },
  {
    id: 'send-list',
    title: 'Enviar Mensaje con Lista',
    description: 'Enviar un mensaje con lista desplegable interactiva',
    icon: ListBulletIcon,
    category: 'mensajes',
    color: 'bg-cyan-500'
  },
  {
    id: 'mark-read',
    title: 'Marcar Mensaje como Leído',
    description: 'Marcar un mensaje recibido como leído',
    icon: CheckCircleIcon,
    category: 'mensajes',
    color: 'bg-emerald-500'
  },
  {
    id: 'get-delivery-status',
    title: 'Obtener Estado de Entrega',
    description: 'Consultar el estado de entrega de un mensaje enviado',
    icon: InformationCircleIcon,
    category: 'informacion',
    color: 'bg-yellow-500'
  },
  {
    id: 'get-phone-info',
    title: 'Obtener Información del Número',
    description: 'Consultar información y estado de un número de teléfono',
    icon: PhoneIcon,
    category: 'informacion',
    color: 'bg-teal-500'
  },
  {
    id: 'verify-phone',
    title: 'Verificar Número de Teléfono',
    description: 'Verificar el estado de verificación de un número',
    icon: ShieldCheckIcon,
    category: 'informacion',
    color: 'bg-orange-500'
  },
  {
    id: 'get-templates',
    title: 'Obtener Plantillas de Mensajes',
    description: 'Listar todas las plantillas de mensajes disponibles',
    icon: RectangleStackIcon,
    category: 'plantillas',
    color: 'bg-violet-500'
  },
  {
    id: 'create-template',
    title: 'Crear Plantilla de Mensaje',
    description: 'Crear una nueva plantilla de mensaje para WhatsApp',
    icon: PaperAirplaneIcon,
    category: 'plantillas',
    color: 'bg-rose-500'
  },
  {
    id: 'delete-template',
    title: 'Eliminar Plantilla',
    description: 'Eliminar una plantilla de mensaje existente',
    icon: TrashIcon,
    category: 'plantillas',
    color: 'bg-red-500'
  },
  {
    id: 'get-webhooks',
    title: 'Obtener Webhooks Configurados',
    description: 'Listar todos los webhooks configurados para este número',
    icon: Cog6ToothIcon,
    category: 'configuracion',
    color: 'bg-sky-500'
  },
  {
    id: 'configure-webhook',
    title: 'Configurar Webhook',
    description: 'Configurar o actualizar la URL del webhook para recibir eventos',
    icon: Cog6ToothIcon,
    category: 'configuracion',
    color: 'bg-slate-500'
  },
  {
    id: 'get-conversations',
    title: 'Obtener Conversaciones',
    description: 'Listar todas las conversaciones activas',
    icon: InboxIcon,
    category: 'conversaciones',
    color: 'bg-amber-500'
  },
  {
    id: 'archive-conversation',
    title: 'Archivar Conversación',
    description: 'Archivar una conversación específica',
    icon: ArchiveBoxIcon,
    category: 'conversaciones',
    color: 'bg-gray-500'
  },
  {
    id: 'unarchive-conversation',
    title: 'Desarchivar Conversación',
    description: 'Restaurar una conversación archivada',
    icon: InboxIcon,
    category: 'conversaciones',
    color: 'bg-lime-500'
  },
  {
    id: 'tag-conversation',
    title: 'Etiquetar Conversación',
    description: 'Agregar o modificar etiquetas en una conversación',
    icon: TagIcon,
    category: 'conversaciones',
    color: 'bg-fuchsia-500'
  },
  {
    id: 'get-media',
    title: 'Obtener Media',
    description: 'Descargar imágenes, documentos u otros archivos multimedia',
    icon: FilmIcon,
    category: 'informacion',
    color: 'bg-cyan-600'
  }
];

const categories = {
  mensajes: 'Mensajes',
  plantillas: 'Plantillas',
  conversaciones: 'Conversaciones',
  configuracion: 'Configuración',
  informacion: 'Información'
};

export default function WhatsAppManager() {
  const [allAgents, setAllAgents] = useState<AgentDB[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentDB | null>(null);
  const [agentDetails, setAgentDetails] = useState<AgentDB | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [sendMessageForm, setSendMessageForm] = useState({ phone_number: '', message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        let list: AgentDB[] = data.ok ? data.agents : [];
        
        // Aplicar filtros de permisos
        const permissions = getPermissions();
        const userId = getUserId();
        if (permissions && userId && permissions.type !== 'admin' && !permissions['whatsapp-manager']?.viewAll) {
          list = list.filter(a => a.client_id === parseInt(userId));
        }
        
        // Filtrar solo agentes que tienen configuración completa de WhatsApp
        // Un agente tiene configuración completa si tiene todos los campos de WhatsApp
        list = list.filter(agent => {
          return agent.whatsapp_business_account_id && 
                 agent.whatsapp_phone_number_id && 
                 agent.whatsapp_access_token && 
                 agent.whatsapp_webhook_verify_token && 
                 agent.whatsapp_app_secret;
        });
        
        setAllAgents(list);
      } catch (e) {
        console.error('[WHATSAPP-MANAGER] Error cargando agentes:', e);
      } finally {
        setAgentsLoading(false);
      }
    };
    
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadAgentDetails(selectedAgent.id);
    } else {
      setAgentDetails(null);
    }
  }, [selectedAgent]);

  const loadAgentDetails = async (agentId: number) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const data = await res.json();
      if (data.ok && data.agent) {
        setAgentDetails(data.agent);
      }
    } catch (e) {
      console.error('[WHATSAPP-MANAGER] Error cargando detalles del agente:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleActionClick = (actionId: string) => {
    if (actionId === 'send-text') {
      if (!selectedAgent) {
        setAlertModal({
          isOpen: true,
          title: 'Agente requerido',
          message: 'Por favor selecciona un agente primero',
          type: 'warning',
        });
        return;
      }
      setShowSendMessageModal(true);
      setSendMessageForm({ phone_number: '', message: '' });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedAgent) return;
    
    if (!sendMessageForm.phone_number.trim() || !sendMessageForm.message.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Campos requeridos',
        message: 'Por favor completa el número de teléfono y el mensaje',
        type: 'warning',
      });
      return;
    }

    setSendingMessage(true);
    try {
      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          phone_number: sendMessageForm.phone_number.trim(),
          message: sendMessageForm.message.trim(),
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setAlertModal({
          isOpen: true,
          title: 'Mensaje enviado',
          message: `Mensaje enviado exitosamente a ${data.data.to}. ID del mensaje: ${data.data.message_id}`,
          type: 'success',
        });
        setShowSendMessageModal(false);
        setSendMessageForm({ phone_number: '', message: '' });
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error al enviar',
          message: data.error || 'Error desconocido al enviar el mensaje',
          type: 'error',
        });
      }
    } catch (e: any) {
      console.error('[WHATSAPP-MANAGER] Error enviando mensaje:', e);
      setAlertModal({
        isOpen: true,
        title: 'Error al enviar',
        message: e?.message || 'Error al procesar el envío del mensaje',
        type: 'error',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp Manager</h1>
        <p className="text-gray-600">
          Operaciones y configuración de WhatsApp Business API
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <AgentSelector
          label="Seleccionar Agente"
          agents={allAgents}
          selectedAgent={selectedAgent}
          onChange={(agent) => {
            if (agent && typeof agent === 'object' && agent.id !== 'all') {
              setSelectedAgent(agent as AgentDB);
            } else {
              setSelectedAgent(null);
            }
          }}
          placeholder="Seleccionar agente con configuración WhatsApp..."
          loading={agentsLoading}
          className="mb-6"
        />

        {loadingDetails && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#5DE1E5] mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Cargando detalles del agente...</p>
          </div>
        )}

        {agentDetails && !loadingDetails && (
          <>
            <div className="mt-6 space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Configuración WhatsApp</h2>
                <p className="text-sm text-gray-600">Información de configuración de WhatsApp Business API para {agentDetails.name}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Account ID
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900">
                    {agentDetails.whatsapp_business_account_id || 'No configurado'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number ID
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900">
                    {agentDetails.whatsapp_phone_number_id || 'No configurado'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono">
                    {agentDetails.whatsapp_access_token || 'No configurado'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook Verify Token
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono">
                    {agentDetails.whatsapp_webhook_verify_token || 'No configurado'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App Secret
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono">
                    {agentDetails.whatsapp_app_secret || 'No configurado'}
                  </div>
                </div>
              </div>
            </div>

            {/* Listado de Acciones de WhatsApp */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Acciones Disponibles</h2>
                <p className="text-sm text-gray-600">Operaciones que puedes realizar con la API de WhatsApp Business</p>
              </div>

              {/* Filtros por categoría */}
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-[#5DE1E5] text-black'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                {Object.entries(categories).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === key
                        ? 'bg-[#5DE1E5] text-black'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Grid de acciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {whatsappActions
                  .filter(action => selectedCategory === 'all' || action.category === selectedCategory)
                  .map((action) => {
                    const Icon = action.icon;
                    return (
                      <div
                        key={action.id}
                        onClick={() => handleActionClick(action.id)}
                        className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-[#5DE1E5]"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`${action.color} p-3 rounded-lg flex-shrink-0`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-[#5DE1E5] transition-colors">
                              {action.title}
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {action.description}
                            </p>
                            <div className="mt-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {categories[action.category]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}

        {!selectedAgent && !agentsLoading && allAgents.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay agentes con configuración completa de WhatsApp.</p>
            <p className="text-sm text-gray-400 mt-2">Configura los campos de WhatsApp en el editor de agentes para que aparezcan aquí.</p>
          </div>
        )}
      </div>

      {/* Modal para enviar mensaje de texto */}
      {showSendMessageModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => !sendingMessage && setShowSendMessageModal(false)}
            />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Enviar Mensaje de Texto
                  </h3>
                  <button
                    onClick={() => !sendingMessage && setShowSendMessageModal(false)}
                    disabled={sendingMessage}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Teléfono
                  </label>
                  <input
                    type="text"
                    value={sendMessageForm.phone_number}
                    onChange={(e) => setSendMessageForm({ ...sendMessageForm, phone_number: e.target.value })}
                    placeholder="Ej: 573001234567 (con código de país, sin +)"
                    disabled={sendingMessage}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Incluye el código de país sin el símbolo + (ej: 57 para Colombia, 1 para USA)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje
                  </label>
                  <textarea
                    value={sendMessageForm.message}
                    onChange={(e) => setSendMessageForm({ ...sendMessageForm, message: e.target.value })}
                    placeholder="Escribe tu mensaje aquí..."
                    rows={6}
                    disabled={sendingMessage}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {sendMessageForm.message.length} caracteres
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Importante: Ventana de 24 horas
                      </p>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        Este mensaje solo se entregará si el usuario ha enviado un mensaje en las últimas 24 horas. 
                        Para enviar mensajes fuera de esta ventana, debes usar <span className="font-semibold">plantillas de mensajes</span>.
                      </p>
                    </div>
                  </div>
                </div>

                {selectedAgent && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Agente:</span> {selectedAgent.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-medium">Phone Number ID:</span> {agentDetails?.whatsapp_phone_number_id || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowSendMessageModal(false)}
                  disabled={sendingMessage}
                  className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !sendMessageForm.phone_number.trim() || !sendMessageForm.message.trim()}
                  className="px-4 py-2 rounded-lg font-medium text-black bg-[#5DE1E5] hover:bg-[#4BC5C9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sendingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-black"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Enviar Mensaje
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
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

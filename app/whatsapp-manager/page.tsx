'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import AgentSelector from '@/components/ui/AgentSelector';
import NoticeModal from '@/components/ui/NoticeModal';
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
    id: 'send-message',
    title: 'Enviar Mensaje',
    description: 'Enviar mensajes de texto, imagen, documento, botones o lista',
    icon: ChatBubbleLeftRightIcon,
    category: 'mensajes',
    color: 'bg-blue-500'
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
  const [selectedCategory, setSelectedCategory] = useState<string>('mensajes');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [showSendTemplateModal, setShowSendTemplateModal] = useState(false);
  const [messageType, setMessageType] = useState<'text' | 'image' | 'document' | 'buttons' | 'list'>('text');
  const [sendMessageForm, setSendMessageForm] = useState({ 
    phone_number: '', 
    message: '',
    image_url: '',
    document_url: '',
    document_filename: '',
    caption: '',
    buttons: [{ id: '', title: '' }],
    list_title: '',
    list_description: '',
    list_button_text: '',
    list_sections: [{ title: '', rows: [{ id: '', title: '', description: '' }] }],
    template_name: '',
    template_language: 'es',
    template_components: [] as any[]
  });
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

  const handleActionClick = async (actionId: string) => {
    if (actionId === 'send-message' || actionId === 'send-text' || actionId === 'send-image' || actionId === 'send-document') {
      if (!selectedAgent) {
        setAlertModal({
          isOpen: true,
          title: 'Agente requerido',
          message: 'Por favor selecciona un agente primero',
          type: 'warning',
        });
        return;
      }
      // Determinar tipo según la acción clickeada
      if (actionId === 'send-image') setMessageType('image');
      else if (actionId === 'send-document') setMessageType('document');
      else setMessageType('text');
      
      setShowSendMessageModal(true);
      setSendMessageForm({ 
        phone_number: '', 
        message: '',
        image_url: '',
        document_url: '',
        document_filename: '',
        caption: '',
        buttons: [{ id: '', title: '' }],
        list_title: '',
        list_description: '',
        list_button_text: '',
        list_sections: [{ title: '', rows: [{ id: '', title: '', description: '' }] }],
        template_name: '',
        template_language: 'es',
        template_components: []
      });
    } else if (actionId === 'send-template') {
      if (!selectedAgent) {
        setAlertModal({
          isOpen: true,
          title: 'Agente requerido',
          message: 'Por favor selecciona un agente primero',
          type: 'warning',
        });
        return;
      }
      setShowSendTemplateModal(true);
      setSendMessageForm({ 
        phone_number: '', 
        message: '',
        image_url: '',
        document_url: '',
        document_filename: '',
        caption: '',
        buttons: [{ id: '', title: '' }],
        list_title: '',
        list_description: '',
        list_button_text: '',
        list_sections: [{ title: '', rows: [{ id: '', title: '', description: '' }] }],
        template_name: '',
        template_language: 'es',
        template_components: []
      });
    } else if (actionId === 'get-templates') {
      if (!selectedAgent) {
        setAlertModal({
          isOpen: true,
          title: 'Agente requerido',
          message: 'Por favor selecciona un agente primero',
          type: 'warning',
        });
        return;
      }
      await loadTemplates();
    }
  };

  const loadTemplates = async () => {
    if (!selectedAgent) return;
    
    setLoadingTemplates(true);
    setTemplates([]);
    try {
      const res = await fetch('/api/whatsapp/get-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setTemplates(data.data || []);
        setTemplatesError(null);
        setShowTemplatesModal(true);
      } else {
        // Si hay error, mostrar el modal con el mensaje de error y el link
        setTemplates([]);
        setTemplatesError(data.error || 'Error desconocido al cargar las plantillas');
        setShowTemplatesModal(true);
      }
    } catch (e: any) {
      console.error('[WHATSAPP-MANAGER] Error cargando plantillas:', e);
      setTemplates([]);
      setTemplatesError(e?.message || 'Error al procesar la solicitud');
      setShowTemplatesModal(true);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSendTemplate = async () => {
    if (!selectedAgent) return;
    
    if (!sendMessageForm.phone_number.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Campo requerido',
        message: 'Por favor completa el número de teléfono',
        type: 'warning',
      });
      return;
    }

    if (!sendMessageForm.template_name.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Campo requerido',
        message: 'Por favor ingresa el nombre de la plantilla',
        type: 'warning',
      });
      return;
    }

    setSendingMessage(true);
    try {
      // Procesar componentes de plantilla si es necesario
      let templateComponents: any[] = [];
      if (sendMessageForm.message.trim()) {
        // Si hay parámetros en el campo message, procesarlos
        const params = sendMessageForm.message.split(',').map(p => p.trim()).filter(p => p);
        if (params.length > 0) {
          templateComponents = [{
            type: 'body',
            parameters: params.map(param => ({
              type: 'text',
              text: param
            }))
          }];
        }
      }

      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          message_type: 'template',
          phone_number: sendMessageForm.phone_number.trim(),
          template_name: sendMessageForm.template_name.trim(),
          template_language: sendMessageForm.template_language,
          template_components: templateComponents.length > 0 ? templateComponents : sendMessageForm.template_components,
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
        setShowSendTemplateModal(false);
        setSendMessageForm({ 
          phone_number: '', 
          message: '',
          image_url: '',
          document_url: '',
          document_filename: '',
          caption: '',
          buttons: [{ id: '', title: '' }],
          list_title: '',
          list_description: '',
          list_button_text: '',
          list_sections: [{ title: '', rows: [{ id: '', title: '', description: '' }] }],
          template_name: '',
          template_language: 'es',
          template_components: []
        });
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error al enviar',
          message: data.error || 'Error desconocido al enviar el mensaje',
          type: 'error',
        });
      }
    } catch (e: any) {
      console.error('[WHATSAPP-MANAGER] Error enviando mensaje con plantilla:', e);
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

  const handleSendMessage = async () => {
    if (!selectedAgent) return;
    
    // Validaciones según el tipo de mensaje
    if (!sendMessageForm.phone_number.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Campo requerido',
        message: 'Por favor completa el número de teléfono',
        type: 'warning',
      });
      return;
    }

    if (messageType === 'text' && !sendMessageForm.message.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Campo requerido',
        message: 'Por favor completa el mensaje',
        type: 'warning',
      });
      return;
    }

    if (messageType === 'image' && !sendMessageForm.image_url.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Campo requerido',
        message: 'Por favor proporciona la URL de la imagen',
        type: 'warning',
      });
      return;
    }

    if (messageType === 'document' && (!sendMessageForm.document_url.trim() || !sendMessageForm.document_filename.trim())) {
      setAlertModal({
        isOpen: true,
        title: 'Campos requeridos',
        message: 'Por favor completa la URL del documento y el nombre del archivo',
        type: 'warning',
      });
      return;
    }

    if (messageType === 'buttons' && (!sendMessageForm.message.trim() || sendMessageForm.buttons.length === 0 || sendMessageForm.buttons.some(b => !b.id.trim() || !b.title.trim()))) {
      setAlertModal({
        isOpen: true,
        title: 'Campos requeridos',
        message: 'Por favor completa el mensaje y al menos un botón con ID y título',
        type: 'warning',
      });
      return;
    }

    if (messageType === 'list' && (!sendMessageForm.list_title.trim() || !sendMessageForm.list_button_text.trim() || sendMessageForm.list_sections.length === 0 || sendMessageForm.list_sections.some(s => s.rows.length === 0))) {
      setAlertModal({
        isOpen: true,
        title: 'Campos requeridos',
        message: 'Por favor completa el título, texto del botón y al menos una sección con filas',
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
          message_type: messageType,
          phone_number: sendMessageForm.phone_number.trim(),
          message: sendMessageForm.message.trim(),
          image_url: sendMessageForm.image_url.trim(),
          document_url: sendMessageForm.document_url.trim(),
          document_filename: sendMessageForm.document_filename.trim(),
          caption: sendMessageForm.caption.trim(),
          buttons: sendMessageForm.buttons,
          list_title: sendMessageForm.list_title.trim(),
          list_description: sendMessageForm.list_description.trim(),
          list_button_text: sendMessageForm.list_button_text.trim(),
          list_sections: sendMessageForm.list_sections,
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
        setSendMessageForm({ 
          phone_number: '', 
          message: '',
          image_url: '',
          document_url: '',
          document_filename: '',
          caption: '',
          buttons: [{ id: '', title: '' }],
          list_title: '',
          list_description: '',
          list_button_text: '',
          list_sections: [{ title: '', rows: [{ id: '', title: '', description: '' }] }],
          template_name: '',
          template_language: 'es',
          template_components: []
        });
        setMessageType('text');
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
                  .filter(action => action.category === selectedCategory)
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

      {/* Modal para enviar mensaje */}
      {showSendMessageModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => !sendingMessage && setShowSendMessageModal(false)}
            />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Enviar Mensaje
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
              
              <div className="px-6 py-4 space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
                {/* Selector de tipo de mensaje */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Mensaje
                  </label>
                  <select
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value as 'text' | 'image' | 'document' | 'buttons' | 'list')}
                    disabled={sendingMessage}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="text">Texto</option>
                    <option value="image">Imagen</option>
                    <option value="document">Documento</option>
                    <option value="buttons">Botones</option>
                    <option value="list">Lista</option>
                  </select>
                </div>

                {/* Número de teléfono (siempre visible) */}
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

                {/* Campos según el tipo de mensaje */}
                {messageType === 'text' && (
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
                )}

                {messageType === 'image' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL de la Imagen
                      </label>
                      <input
                        type="url"
                        value={sendMessageForm.image_url}
                        onChange={(e) => setSendMessageForm({ ...sendMessageForm, image_url: e.target.value })}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        disabled={sendingMessage}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        La imagen debe estar públicamente accesible vía HTTPS
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Caption (Opcional)
                      </label>
                      <textarea
                        value={sendMessageForm.caption}
                        onChange={(e) => setSendMessageForm({ ...sendMessageForm, caption: e.target.value })}
                        placeholder="Texto que aparecerá con la imagen..."
                        rows={3}
                        disabled={sendingMessage}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                      />
                    </div>
                  </>
                )}

                {messageType === 'document' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL del Documento
                      </label>
                      <input
                        type="url"
                        value={sendMessageForm.document_url}
                        onChange={(e) => setSendMessageForm({ ...sendMessageForm, document_url: e.target.value })}
                        placeholder="https://ejemplo.com/documento.pdf"
                        disabled={sendingMessage}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Archivo
                      </label>
                      <input
                        type="text"
                        value={sendMessageForm.document_filename}
                        onChange={(e) => setSendMessageForm({ ...sendMessageForm, document_filename: e.target.value })}
                        placeholder="documento.pdf"
                        disabled={sendingMessage}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Caption (Opcional)
                      </label>
                      <textarea
                        value={sendMessageForm.caption}
                        onChange={(e) => setSendMessageForm({ ...sendMessageForm, caption: e.target.value })}
                        placeholder="Texto que aparecerá con el documento..."
                        rows={3}
                        disabled={sendingMessage}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                      />
                    </div>
                  </>
                )}

                {messageType === 'buttons' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mensaje
                      </label>
                      <textarea
                        value={sendMessageForm.message}
                        onChange={(e) => setSendMessageForm({ ...sendMessageForm, message: e.target.value })}
                        placeholder="Mensaje que aparecerá antes de los botones..."
                        rows={4}
                        disabled={sendingMessage}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Botones (máximo 3)
                      </label>
                      {sendMessageForm.buttons.map((button, index) => (
                        <div key={index} className="mb-3 p-3 border border-gray-200 rounded-lg">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              value={button.id}
                              onChange={(e) => {
                                const newButtons = [...sendMessageForm.buttons];
                                newButtons[index].id = e.target.value;
                                setSendMessageForm({ ...sendMessageForm, buttons: newButtons });
                              }}
                              placeholder="ID del botón (ej: btn1)"
                              disabled={sendingMessage}
                              className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            <input
                              type="text"
                              value={button.title}
                              onChange={(e) => {
                                const newButtons = [...sendMessageForm.buttons];
                                newButtons[index].title = e.target.value;
                                setSendMessageForm({ ...sendMessageForm, buttons: newButtons });
                              }}
                              placeholder="Título del botón"
                              disabled={sendingMessage}
                              className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                          {sendMessageForm.buttons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newButtons = sendMessageForm.buttons.filter((_, i) => i !== index);
                                setSendMessageForm({ ...sendMessageForm, buttons: newButtons });
                              }}
                              disabled={sendingMessage}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      ))}
                      {sendMessageForm.buttons.length < 3 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSendMessageForm({ ...sendMessageForm, buttons: [...sendMessageForm.buttons, { id: '', title: '' }] });
                          }}
                          disabled={sendingMessage}
                          className="text-sm text-[#5DE1E5] hover:text-[#4BC5C9] font-medium"
                        >
                          + Agregar Botón
                        </button>
                      )}
                    </div>
                  </>
                )}

                {messageType === 'list' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Título de la Lista
                      </label>
                      <input
                        type="text"
                        value={sendMessageForm.list_title}
                        onChange={(e) => setSendMessageForm({ ...sendMessageForm, list_title: e.target.value })}
                        placeholder="Título (máximo 60 caracteres)"
                        disabled={sendingMessage}
                        maxLength={60}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción (Opcional)
                      </label>
                      <textarea
                        value={sendMessageForm.list_description}
                        onChange={(e) => setSendMessageForm({ ...sendMessageForm, list_description: e.target.value })}
                        placeholder="Descripción de la lista..."
                        rows={2}
                        disabled={sendingMessage}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Texto del Botón
                      </label>
                      <input
                        type="text"
                        value={sendMessageForm.list_button_text}
                        onChange={(e) => setSendMessageForm({ ...sendMessageForm, list_button_text: e.target.value })}
                        placeholder="Texto del botón (máximo 20 caracteres)"
                        disabled={sendingMessage}
                        maxLength={20}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secciones y Filas
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Máximo 10 secciones, cada una con máximo 10 filas
                      </p>
                      {sendMessageForm.list_sections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-4 p-3 border border-gray-200 rounded-lg">
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => {
                              const newSections = [...sendMessageForm.list_sections];
                              newSections[sectionIndex].title = e.target.value;
                              setSendMessageForm({ ...sendMessageForm, list_sections: newSections });
                            }}
                            placeholder="Título de la sección"
                            disabled={sendingMessage}
                            className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] mb-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          {section.rows.map((row, rowIndex) => (
                            <div key={rowIndex} className="mb-2 p-2 bg-gray-50 rounded">
                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={row.id}
                                  onChange={(e) => {
                                    const newSections = [...sendMessageForm.list_sections];
                                    newSections[sectionIndex].rows[rowIndex].id = e.target.value;
                                    setSendMessageForm({ ...sendMessageForm, list_sections: newSections });
                                  }}
                                  placeholder="ID"
                                  disabled={sendingMessage}
                                  className="block w-full rounded-md bg-white px-2 py-1 text-xs text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                                <input
                                  type="text"
                                  value={row.title}
                                  onChange={(e) => {
                                    const newSections = [...sendMessageForm.list_sections];
                                    newSections[sectionIndex].rows[rowIndex].title = e.target.value;
                                    setSendMessageForm({ ...sendMessageForm, list_sections: newSections });
                                  }}
                                  placeholder="Título"
                                  disabled={sendingMessage}
                                  className="block w-full rounded-md bg-white px-2 py-1 text-xs text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                                <input
                                  type="text"
                                  value={row.description}
                                  onChange={(e) => {
                                    const newSections = [...sendMessageForm.list_sections];
                                    newSections[sectionIndex].rows[rowIndex].description = e.target.value;
                                    setSendMessageForm({ ...sendMessageForm, list_sections: newSections });
                                  }}
                                  placeholder="Descripción"
                                  disabled={sendingMessage}
                                  className="block w-full rounded-md bg-white px-2 py-1 text-xs text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </div>
                              {section.rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSections = [...sendMessageForm.list_sections];
                                    newSections[sectionIndex].rows = newSections[sectionIndex].rows.filter((_, i) => i !== rowIndex);
                                    setSendMessageForm({ ...sendMessageForm, list_sections: newSections });
                                  }}
                                  disabled={sendingMessage}
                                  className="text-xs text-red-600 hover:text-red-800 mt-1"
                                >
                                  Eliminar fila
                                </button>
                              )}
                            </div>
                          ))}
                          {section.rows.length < 10 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newSections = [...sendMessageForm.list_sections];
                                newSections[sectionIndex].rows.push({ id: '', title: '', description: '' });
                                setSendMessageForm({ ...sendMessageForm, list_sections: newSections });
                              }}
                              disabled={sendingMessage}
                              className="text-xs text-[#5DE1E5] hover:text-[#4BC5C9] font-medium"
                            >
                              + Agregar Fila
                            </button>
                          )}
                          {sendMessageForm.list_sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newSections = sendMessageForm.list_sections.filter((_, i) => i !== sectionIndex);
                                setSendMessageForm({ ...sendMessageForm, list_sections: newSections });
                              }}
                              disabled={sendingMessage}
                              className="text-xs text-red-600 hover:text-red-800 mt-2"
                            >
                              Eliminar sección
                            </button>
                          )}
                        </div>
                      ))}
                      {sendMessageForm.list_sections.length < 10 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSendMessageForm({ ...sendMessageForm, list_sections: [...sendMessageForm.list_sections, { title: '', rows: [{ id: '', title: '', description: '' }] }] });
                          }}
                          disabled={sendingMessage}
                          className="text-sm text-[#5DE1E5] hover:text-[#4BC5C9] font-medium"
                        >
                          + Agregar Sección
                        </button>
                      )}
                    </div>
                  </>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Importante: Ventana de 24 horas
                      </p>
                      <p className="text-xs text-blue-800 leading-relaxed break-words overflow-wrap-anywhere">
                        Este mensaje solo se entregará si el usuario ha enviado un mensaje en las últimas 24 horas. 
                        Para enviar mensajes fuera de esta ventana, debes usar <span className="font-semibold">plantillas de mensajes</span>.
                      </p>
                    </div>
                  </div>
                </div>

                {selectedAgent && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 break-words overflow-wrap-anywhere">
                      <span className="font-medium">Agente:</span> {selectedAgent.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 break-words overflow-wrap-anywhere">
                      <span className="font-medium">Phone Number ID:</span> {agentDetails?.whatsapp_phone_number_id || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowSendMessageModal(false);
                    setMessageType('text');
                    setSendMessageForm({ 
                      phone_number: '', 
                      message: '',
                      image_url: '',
                      document_url: '',
                      document_filename: '',
                      caption: '',
                      buttons: [{ id: '', title: '' }],
                      list_title: '',
                      list_description: '',
                      list_button_text: '',
                      list_sections: [{ title: '', rows: [{ id: '', title: '', description: '' }] }],
                      template_name: '',
                      template_language: 'es',
                      template_components: []
                    });
                  }}
                  disabled={sendingMessage}
                  className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !sendMessageForm.phone_number.trim() || 
                    (messageType === 'text' && !sendMessageForm.message.trim()) ||
                    (messageType === 'image' && !sendMessageForm.image_url.trim()) ||
                    (messageType === 'document' && (!sendMessageForm.document_url.trim() || !sendMessageForm.document_filename.trim())) ||
                    (messageType === 'buttons' && (!sendMessageForm.message.trim() || sendMessageForm.buttons.some(b => !b.id.trim() || !b.title.trim()))) ||
                    (messageType === 'list' && (!sendMessageForm.list_title.trim() || !sendMessageForm.list_button_text.trim()))
                  }
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

      {/* Modal para enviar mensaje con plantilla */}
      {showSendTemplateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => !sendingMessage && setShowSendTemplateModal(false)}
            />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Enviar Mensaje con Plantilla
                  </h3>
                  <button
                    onClick={() => !sendingMessage && setShowSendTemplateModal(false)}
                    disabled={sendingMessage}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Número de teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Teléfono *
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

                {/* Nombre de la plantilla */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Plantilla *
                  </label>
                  <input
                    type="text"
                    value={sendMessageForm.template_name}
                    onChange={(e) => setSendMessageForm({ ...sendMessageForm, template_name: e.target.value })}
                    placeholder="Ej: bienvenida, confirmacion_pedido"
                    disabled={sendingMessage}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500 break-words overflow-wrap-anywhere">
                    Nombre exacto de la plantilla aprobada por WhatsApp (sin espacios, usa guiones bajos)
                  </p>
                </div>

                {/* Idioma */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma
                  </label>
                  <select
                    value={sendMessageForm.template_language}
                    onChange={(e) => setSendMessageForm({ ...sendMessageForm, template_language: e.target.value })}
                    disabled={sendingMessage}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="es">Español (es)</option>
                    <option value="en">Inglés (en)</option>
                    <option value="pt">Portugués (pt)</option>
                    <option value="fr">Francés (fr)</option>
                  </select>
                </div>

                {/* Parámetros */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parámetros de la Plantilla (Opcional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2 break-words overflow-wrap-anywhere">
                    Si la plantilla tiene variables, ingrésalas separadas por comas. Ej: &quot;Juan, Pedido #123, $50.000&quot;
                  </p>
                  <textarea
                    value={sendMessageForm.message}
                    onChange={(e) => setSendMessageForm({ ...sendMessageForm, message: e.target.value })}
                    placeholder="Parámetros separados por comas (solo si la plantilla los requiere)"
                    rows={3}
                    disabled={sendingMessage}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500 break-words overflow-wrap-anywhere">
                    Nota: Los parámetros se procesarán automáticamente según el formato de la plantilla
                  </p>
                </div>

                {/* Información */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 mb-1">
                        Plantillas: Sin límite de tiempo
                      </p>
                      <p className="text-xs text-green-800 leading-relaxed break-words overflow-wrap-anywhere">
                        Las plantillas de mensajes pueden enviarse en cualquier momento, incluso fuera de la ventana de 24 horas. 
                        Asegúrate de que la plantilla esté aprobada por WhatsApp antes de usarla.
                      </p>
                    </div>
                  </div>
                </div>

                {selectedAgent && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 break-words overflow-wrap-anywhere">
                      <span className="font-medium">Agente:</span> {selectedAgent.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 break-words overflow-wrap-anywhere">
                      <span className="font-medium">Phone Number ID:</span> {agentDetails?.whatsapp_phone_number_id || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowSendTemplateModal(false);
                    setSendMessageForm({ 
                      phone_number: '', 
                      message: '',
                      image_url: '',
                      document_url: '',
                      document_filename: '',
                      caption: '',
                      buttons: [{ id: '', title: '' }],
                      list_title: '',
                      list_description: '',
                      list_button_text: '',
                      list_sections: [{ title: '', rows: [{ id: '', title: '', description: '' }] }],
                      template_name: '',
                      template_language: 'es',
                      template_components: []
                    });
                  }}
                  disabled={sendingMessage}
                  className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendTemplate}
                  disabled={sendingMessage || !sendMessageForm.phone_number.trim() || !sendMessageForm.template_name.trim()}
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

      {/* Modal de Plantillas */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowTemplatesModal(false)}
            />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Plantillas de Mensajes
                  </h3>
                  <button
                    onClick={() => setShowTemplatesModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4">
                {loadingTemplates ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#5DE1E5] mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Cargando plantillas...</p>
                  </div>
                ) : templates.length === 0 || templatesError ? (
                  <div className="text-center py-8">
                    {templatesError && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 font-medium mb-2">Error al cargar plantillas:</p>
                        <p className="text-xs text-red-600">{templatesError}</p>
                      </div>
                    )}
                    <p className="text-gray-500 mb-4">
                      {templatesError ? 'No se pudieron cargar las plantillas.' : 'No hay plantillas disponibles.'}
                    </p>
                    {selectedAgent && agentDetails?.whatsapp_business_account_id && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900 font-medium mb-2">Administrar plantillas:</p>
                        <a
                          href={`https://business.facebook.com/latest/whatsapp_manager/message_templates?business_id=${agentDetails.whatsapp_business_account_id}&tab=message-templates&nav_ref=whatsapp_manager&asset_id=${agentDetails.whatsapp_phone_number_id || agentDetails.whatsapp_business_account_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline break-all break-words overflow-wrap-anywhere block"
                        >
                          https://business.facebook.com/latest/whatsapp_manager/message_templates?business_id={agentDetails.whatsapp_business_account_id}&tab=message-templates&nav_ref=whatsapp_manager&asset_id={agentDetails.whatsapp_phone_number_id || agentDetails.whatsapp_business_account_id}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templates.map((template, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-base font-semibold text-gray-900 mb-1 break-words overflow-wrap-anywhere">
                              {template.name || 'Sin nombre'}
                            </h4>
                            {template.language && (
                              <p className="text-xs text-gray-500 mb-2">
                                Idioma: {template.language}
                              </p>
                            )}
                            {template.status && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                template.status === 'APPROVED' 
                                  ? 'bg-green-100 text-green-800'
                                  : template.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {template.status}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {template.components && template.components.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {template.components.map((component: any, compIndex: number) => (
                              <div key={compIndex} className="bg-gray-50 rounded p-2">
                                <p className="text-xs font-medium text-gray-700 mb-1">
                                  {component.type === 'HEADER' ? 'Encabezado' : 
                                   component.type === 'BODY' ? 'Cuerpo' : 
                                   component.type === 'FOOTER' ? 'Pie' : component.type}
                                </p>
                                {component.text && (
                                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                    {component.text}
                                  </p>
                                )}
                                {component.format && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Formato: {component.format}
                                  </p>
                                )}
                                {component.buttons && component.buttons.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {component.buttons.map((btn: any, btnIndex: number) => (
                                      <div key={btnIndex} className="text-xs text-gray-600 break-words overflow-wrap-anywhere">
                                        {btn.type === 'QUICK_REPLY' ? 'Respuesta rápida' : 
                                         btn.type === 'URL' ? 'URL' : 
                                         btn.type === 'PHONE_NUMBER' ? 'Teléfono' : btn.type}: {btn.text || btn.url || btn.phone_number}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end border-t border-gray-200">
                <button
                  onClick={() => setShowTemplatesModal(false)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
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

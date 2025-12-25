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
  category: 'mensajes' | 'plantillas' | 'informacion';
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
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [selectedTemplateToDelete, setSelectedTemplateToDelete] = useState<any>(null);
  const [showDeliveryStatusModal, setShowDeliveryStatusModal] = useState(false);
  const [checkingDeliveryStatus, setCheckingDeliveryStatus] = useState(false);
  const [deliveryStatusForm, setDeliveryStatusForm] = useState({ message_id: '' });
  const [deliveryStatusResult, setDeliveryStatusResult] = useState<any>(null);
  const [showPhoneInfoModal, setShowPhoneInfoModal] = useState(false);
  const [checkingPhoneInfo, setCheckingPhoneInfo] = useState(false);
  const [phoneInfoForm, setPhoneInfoForm] = useState({ phone_number: '' });
  const [phoneInfoResult, setPhoneInfoResult] = useState<any>(null);
  const [showGetMediaModal, setShowGetMediaModal] = useState(false);
  const [gettingMedia, setGettingMedia] = useState(false);
  const [mediaForm, setMediaForm] = useState({ media_id: '' });
  const [mediaResult, setMediaResult] = useState<any>(null);
  const [createTemplateForm, setCreateTemplateForm] = useState({
    name: '',
    language: '',
    category: 'UTILITY',
    header_text: '',
    header_format: 'TEXT',
    body_text: '',
    footer_text: '',
    buttons: [] as Array<{ type: string; text: string; url?: string; phone_number?: string }>
  });
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
    template_language: '',
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
        
        console.log('[WHATSAPP-MANAGER] Total agentes cargados:', list.length);
        
        // Aplicar filtros de permisos
        const permissions = getPermissions();
        const userId = getUserId();
        if (permissions && userId && permissions.type !== 'admin' && !permissions['whatsapp-manager']?.viewAll) {
          list = list.filter(a => a.client_id === parseInt(userId));
          console.log('[WHATSAPP-MANAGER] Agentes después de filtro de permisos:', list.length);
        }
        
        // Filtrar solo agentes que tienen configuración básica de WhatsApp
        // Un agente tiene configuración básica si tiene business_account_id, phone_number_id y access_token
        // Los otros campos (webhook_verify_token y app_secret) son opcionales
        const agentsWithWhatsApp = list.filter(agent => {
          const hasBusinessAccount = agent.whatsapp_business_account_id && 
                                     typeof agent.whatsapp_business_account_id === 'string' &&
                                     agent.whatsapp_business_account_id.trim() !== '';
          const hasPhoneNumber = agent.whatsapp_phone_number_id && 
                                 typeof agent.whatsapp_phone_number_id === 'string' &&
                                 agent.whatsapp_phone_number_id.trim() !== '';
          const hasAccessToken = agent.whatsapp_access_token && 
                                 typeof agent.whatsapp_access_token === 'string' &&
                                 agent.whatsapp_access_token.trim() !== '';
          
          const hasConfig = hasBusinessAccount && hasPhoneNumber && hasAccessToken;
          
          if (!hasConfig) {
            console.log('[WHATSAPP-MANAGER] Agente', agent.id, agent.name, 'sin configuración completa:', {
              business_account: hasBusinessAccount,
              phone_number: hasPhoneNumber,
              access_token: hasAccessToken,
              business_account_id: agent.whatsapp_business_account_id ? 'presente' : 'ausente',
              phone_number_id: agent.whatsapp_phone_number_id ? 'presente' : 'ausente',
              access_token: agent.whatsapp_access_token ? 'presente' : 'ausente'
            });
          }
          
          // Un agente tiene configuración básica si tiene estos 3 campos esenciales
          return hasConfig;
        });
        
        console.log('[WHATSAPP-MANAGER] Agentes con WhatsApp configurado:', agentsWithWhatsApp.length);
        agentsWithWhatsApp.forEach(agent => {
          console.log('[WHATSAPP-MANAGER] - Agente', agent.id, agent.name, 'tiene WhatsApp configurado');
        });
        
        setAllAgents(agentsWithWhatsApp);
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
        template_language: '',
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
        template_language: '',
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
    } else if (actionId === 'create-template') {
      if (!selectedAgent) {
        setAlertModal({
          isOpen: true,
          title: 'Agente requerido',
          message: 'Por favor selecciona un agente primero',
          type: 'warning',
        });
        return;
      }
      setShowCreateTemplateModal(true);
      setCreateTemplateForm({
        name: '',
        language: '',
        category: 'UTILITY',
        header_text: '',
        header_format: 'TEXT',
        body_text: '',
        footer_text: '',
        buttons: []
      });
    } else if (actionId === 'delete-template') {
      if (!selectedAgent) {
        setAlertModal({
          isOpen: true,
          title: 'Agente requerido',
          message: 'Por favor selecciona un agente primero',
          type: 'warning',
        });
        return;
      }
      // Cargar plantillas primero para poder seleccionar una
      await loadTemplates();
      setShowDeleteTemplateModal(true);
    } else if (actionId === 'get-delivery-status') {
      if (!selectedAgent) {
        setAlertModal({
          isOpen: true,
          title: 'Agente requerido',
          message: 'Por favor selecciona un agente primero',
          type: 'warning',
        });
        return;
      }
      setShowDeliveryStatusModal(true);
      setDeliveryStatusForm({ message_id: '' });
      setDeliveryStatusResult(null);
    } else if (actionId === 'get-phone-info') {
      if (!selectedAgent) {
        setAlertModal({
          isOpen: true,
          title: 'Agente requerido',
          message: 'Por favor selecciona un agente primero',
          type: 'warning',
        });
        return;
      }
      setShowPhoneInfoModal(true);
      setPhoneInfoForm({ phone_number: '' });
      setPhoneInfoResult(null);
    } else if (actionId === 'get-media') {
      if (!selectedAgent) {
        setAlertModal({
          isOpen: true,
          title: 'Agente requerido',
          message: 'Por favor selecciona un agente primero',
          type: 'warning',
        });
        return;
      }
      setShowGetMediaModal(true);
      setMediaForm({ media_id: '' });
      setMediaResult(null);
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

    if (!sendMessageForm.template_language || sendMessageForm.template_language.trim() === '') {
      setAlertModal({
        isOpen: true,
        title: 'Campo requerido',
        message: 'Por favor selecciona el idioma de la plantilla. Debe coincidir exactamente con el idioma de la plantilla en WhatsApp.',
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
          template_language: '',
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
          template_language: '',
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

  const handleCreateTemplate = async () => {
    if (!selectedAgent) return;

    if (!createTemplateForm.name.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Campo requerido',
        message: 'Por favor ingresa el nombre de la plantilla',
        type: 'warning',
      });
      return;
    }

    if (!createTemplateForm.language.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Campo requerido',
        message: 'Por favor selecciona el idioma de la plantilla',
        type: 'warning',
      });
      return;
    }

    if (!createTemplateForm.body_text.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Campo requerido',
        message: 'El cuerpo del mensaje es obligatorio',
        type: 'warning',
      });
      return;
    }

    setCreatingTemplate(true);
    try {
      // Construir componentes de la plantilla
      const components: any[] = [];

      // HEADER (opcional)
      if (createTemplateForm.header_text.trim()) {
        if (createTemplateForm.header_format === 'TEXT') {
          components.push({
            type: 'HEADER',
            format: 'TEXT',
            text: createTemplateForm.header_text.trim()
          });
        } else {
          // Para IMAGE, VIDEO, DOCUMENT se requiere un ejemplo con handle
          components.push({
            type: 'HEADER',
            format: createTemplateForm.header_format
          });
        }
      }

      // BODY (obligatorio)
      components.push({
        type: 'BODY',
        text: createTemplateForm.body_text.trim()
      });

      // FOOTER (opcional)
      if (createTemplateForm.footer_text.trim()) {
        components.push({
          type: 'FOOTER',
          text: createTemplateForm.footer_text.trim()
        });
      }

      // BUTTONS (opcional, máximo 3)
      if (createTemplateForm.buttons.length > 0) {
        const validButtons = createTemplateForm.buttons
          .filter(btn => btn.type && btn.text && btn.text.trim() !== '')
          .slice(0, 3); // Máximo 3 botones

        if (validButtons.length > 0) {
          components.push({
            type: 'BUTTONS',
            buttons: validButtons.map(btn => {
              const button: any = {
                type: btn.type,
                text: btn.text.trim()
              };
              if (btn.type === 'URL' && btn.url) {
                button.url = btn.url.trim();
              } else if (btn.type === 'PHONE_NUMBER' && btn.phone_number) {
                button.phone_number = btn.phone_number.trim();
              }
              return button;
            })
          });
        }
      }

      const res = await fetch('/api/whatsapp/create-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          name: createTemplateForm.name.trim(),
          language: createTemplateForm.language.trim(),
          category: createTemplateForm.category,
          components: components
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setAlertModal({
          isOpen: true,
          title: 'Plantilla Creada',
          message: data.message || 'La plantilla ha sido creada exitosamente. Debe ser aprobada por WhatsApp antes de poder usarse.',
          type: 'success',
        });
        setShowCreateTemplateModal(false);
        setCreateTemplateForm({
          name: '',
          language: '',
          category: 'UTILITY',
          header_text: '',
          header_format: 'TEXT',
          body_text: '',
          footer_text: '',
          buttons: []
        });
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error al crear plantilla',
          message: data.error || 'Error desconocido al crear la plantilla',
          type: 'error',
        });
      }
    } catch (e: any) {
      console.error('[WHATSAPP-MANAGER] Error creando plantilla:', e);
      setAlertModal({
        isOpen: true,
        title: 'Error al crear plantilla',
        message: e?.message || 'Error al procesar la creación de la plantilla',
        type: 'error',
      });
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedAgent || !selectedTemplateToDelete) return;

    setDeletingTemplate(true);
    try {
      const res = await fetch('/api/whatsapp/delete-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          template_id: selectedTemplateToDelete.id
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setAlertModal({
          isOpen: true,
          title: 'Plantilla Eliminada',
          message: data.message || 'La plantilla ha sido eliminada exitosamente.',
          type: 'success',
        });
        setShowDeleteTemplateModal(false);
        setSelectedTemplateToDelete(null);
        // Recargar plantillas para actualizar la lista
        await loadTemplates();
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error al eliminar plantilla',
          message: data.error || 'Error desconocido al eliminar la plantilla',
          type: 'error',
        });
      }
    } catch (e: any) {
      console.error('[WHATSAPP-MANAGER] Error eliminando plantilla:', e);
      setAlertModal({
        isOpen: true,
        title: 'Error al eliminar plantilla',
        message: e?.message || 'Error al procesar la eliminación de la plantilla',
        type: 'error',
      });
    } finally {
      setDeletingTemplate(false);
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
                      template_language: '',
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
                    Idioma *
                  </label>
                  <select
                    value={sendMessageForm.template_language}
                    onChange={(e) => setSendMessageForm({ ...sendMessageForm, template_language: e.target.value })}
                    disabled={sendingMessage}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar idioma...</option>
                    <optgroup label="Español">
                      <option value="es">Español (es)</option>
                      <option value="es_MX">Español México (es_MX)</option>
                      <option value="es_ES">Español España (es_ES)</option>
                      <option value="es_AR">Español Argentina (es_AR)</option>
                      <option value="es_CO">Español Colombia (es_CO)</option>
                    </optgroup>
                    <optgroup label="Inglés">
                      <option value="en">Inglés (en)</option>
                      <option value="en_US">Inglés Estados Unidos (en_US)</option>
                      <option value="en_GB">Inglés Reino Unido (en_GB)</option>
                    </optgroup>
                    <optgroup label="Portugués">
                      <option value="pt">Portugués (pt)</option>
                      <option value="pt_BR">Portugués Brasil (pt_BR)</option>
                      <option value="pt_PT">Portugués Portugal (pt_PT)</option>
                    </optgroup>
                    <optgroup label="Francés">
                      <option value="fr">Francés (fr)</option>
                      <option value="fr_FR">Francés Francia (fr_FR)</option>
                      <option value="fr_CA">Francés Canadá (fr_CA)</option>
                    </optgroup>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 break-words overflow-wrap-anywhere">
                    El código de idioma debe coincidir exactamente con el de la plantilla. Si ves &quot;English (US)&quot; en la plantilla, usa &quot;en_US&quot;.
                  </p>
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
                      template_language: '',
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
                            <button
                              type="button"
                              onClick={() => {
                                setSendMessageForm({
                                  ...sendMessageForm,
                                  template_name: template.name || '',
                                  template_language: template.language || '',
                                });
                                setShowTemplatesModal(false);
                                setShowSendTemplateModal(true);
                              }}
                              className="mt-2 text-xs text-[#5DE1E5] hover:text-[#4BC4C7] font-medium underline"
                            >
                              Usar esta plantilla
                            </button>
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

      {/* Create Template Modal */}
      {showCreateTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Crear Plantilla de Mensaje</h2>
              <p className="text-sm text-gray-600 mt-1">Crea una nueva plantilla de mensaje para WhatsApp Business</p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Plantilla *
                </label>
                <input
                  type="text"
                  value={createTemplateForm.name}
                  onChange={(e) => setCreateTemplateForm({ ...createTemplateForm, name: e.target.value })}
                  placeholder="Ej: bienvenida, confirmacion_pedido"
                  disabled={creatingTemplate}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 break-words overflow-wrap-anywhere">
                  Sin espacios, usa guiones bajos. Ej: bienvenida_usuario
                </p>
              </div>

              {/* Idioma */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma *
                </label>
                <select
                  value={createTemplateForm.language}
                  onChange={(e) => setCreateTemplateForm({ ...createTemplateForm, language: e.target.value })}
                  disabled={creatingTemplate}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccionar idioma...</option>
                  <optgroup label="Español">
                    <option value="es">Español (es)</option>
                    <option value="es_MX">Español México (es_MX)</option>
                    <option value="es_ES">Español España (es_ES)</option>
                    <option value="es_AR">Español Argentina (es_AR)</option>
                    <option value="es_CO">Español Colombia (es_CO)</option>
                  </optgroup>
                  <optgroup label="Inglés">
                    <option value="en">Inglés (en)</option>
                    <option value="en_US">Inglés Estados Unidos (en_US)</option>
                    <option value="en_GB">Inglés Reino Unido (en_GB)</option>
                  </optgroup>
                  <optgroup label="Portugués">
                    <option value="pt">Portugués (pt)</option>
                    <option value="pt_BR">Portugués Brasil (pt_BR)</option>
                    <option value="pt_PT">Portugués Portugal (pt_PT)</option>
                  </optgroup>
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  value={createTemplateForm.category}
                  onChange={(e) => setCreateTemplateForm({ ...createTemplateForm, category: e.target.value })}
                  disabled={creatingTemplate}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="UTILITY">Utilidad (UTILITY)</option>
                  <option value="MARKETING">Marketing (MARKETING)</option>
                  <option value="AUTHENTICATION">Autenticación (AUTHENTICATION)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 break-words overflow-wrap-anywhere">
                  UTILITY: Mensajes transaccionales. MARKETING: Promociones. AUTHENTICATION: Códigos de verificación.
                </p>
              </div>

              {/* Header */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Encabezado (Opcional)
                </label>
                <select
                  value={createTemplateForm.header_format}
                  onChange={(e) => setCreateTemplateForm({ ...createTemplateForm, header_format: e.target.value })}
                  disabled={creatingTemplate}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed mb-2"
                >
                  <option value="TEXT">Texto</option>
                  <option value="IMAGE">Imagen</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Documento</option>
                </select>
                {createTemplateForm.header_format === 'TEXT' && (
                  <input
                    type="text"
                    value={createTemplateForm.header_text}
                    onChange={(e) => setCreateTemplateForm({ ...createTemplateForm, header_text: e.target.value })}
                    placeholder="Texto del encabezado"
                    disabled={creatingTemplate}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                )}
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuerpo del Mensaje *
                </label>
                <textarea
                  value={createTemplateForm.body_text}
                  onChange={(e) => setCreateTemplateForm({ ...createTemplateForm, body_text: e.target.value })}
                  placeholder="Escribe el mensaje principal. Usa {{1}}, {{2}}, etc. para variables dinámicas."
                  disabled={creatingTemplate}
                  rows={4}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 break-words overflow-wrap-anywhere">
                  Ejemplo: Hola {'{{1}}'}, tu pedido {'{{2}}'} ha sido enviado.
                </p>
              </div>

              {/* Footer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pie de Página (Opcional)
                </label>
                <input
                  type="text"
                  value={createTemplateForm.footer_text}
                  onChange={(e) => setCreateTemplateForm({ ...createTemplateForm, footer_text: e.target.value })}
                  placeholder="Texto del pie de página"
                  disabled={creatingTemplate}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowCreateTemplateModal(false)}
                disabled={creatingTemplate}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={creatingTemplate || !createTemplateForm.name.trim() || !createTemplateForm.language.trim() || !createTemplateForm.body_text.trim()}
                className="px-4 py-2 rounded-lg font-medium text-white bg-[#5DE1E5] hover:bg-[#4BC4C7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creatingTemplate ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Creando...</span>
                  </>
                ) : (
                  <span>Crear Plantilla</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para obtener estado de entrega */}
      {showDeliveryStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Obtener Estado de Entrega</h2>
              <p className="text-sm text-gray-600 mt-1">Consulta el estado de entrega de un mensaje enviado</p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message ID *
                </label>
                <input
                  type="text"
                  value={deliveryStatusForm.message_id}
                  onChange={(e) => setDeliveryStatusForm({ ...deliveryStatusForm, message_id: e.target.value })}
                  placeholder="wamid.xxxxx"
                  disabled={checkingDeliveryStatus}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 break-words overflow-wrap-anywhere">
                  El Message ID se obtiene al enviar un mensaje. Ejemplo: wamid.HBgNMTIzNDU2Nzg5MDEyFQIAERgSQjU5QjY0QzE3QzY4QzY4QzY4
                </p>
              </div>

              {deliveryStatusResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Resultado:</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Message ID:</span>{' '}
                      <span className="text-gray-900 font-mono text-xs break-all">{deliveryStatusResult.message_id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Estado:</span>{' '}
                      <span className={`font-semibold ${
                        deliveryStatusResult.status === 'sent' ? 'text-blue-600' :
                        deliveryStatusResult.status === 'delivered' ? 'text-green-600' :
                        deliveryStatusResult.status === 'read' ? 'text-purple-600' :
                        'text-gray-600'
                      }`}>
                        {deliveryStatusResult.status}
                      </span>
                    </div>
                    {deliveryStatusResult.recipient_id && (
                      <div>
                        <span className="font-medium text-gray-700">Recipient ID:</span>{' '}
                        <span className="text-gray-900 font-mono text-xs break-all">{deliveryStatusResult.recipient_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeliveryStatusModal(false);
                  setDeliveryStatusForm({ message_id: '' });
                  setDeliveryStatusResult(null);
                }}
                disabled={checkingDeliveryStatus}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cerrar
              </button>
              <button
                onClick={async () => {
                  if (!deliveryStatusForm.message_id.trim()) {
                    setAlertModal({
                      isOpen: true,
                      title: 'Campo requerido',
                      message: 'Por favor ingresa el Message ID',
                      type: 'warning',
                    });
                    return;
                  }

                  setCheckingDeliveryStatus(true);
                  try {
                    const res = await fetch('/api/whatsapp/get-message-status', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        agent_id: selectedAgent?.id,
                        message_id: deliveryStatusForm.message_id.trim(),
                      }),
                    });

                    const data = await res.json();

                    if (data.ok) {
                      setDeliveryStatusResult(data.data);
                    } else {
                      setAlertModal({
                        isOpen: true,
                        title: 'Error',
                        message: data.error || 'Error al obtener el estado del mensaje',
                        type: 'error',
                      });
                    }
                  } catch (e: any) {
                    console.error('[WHATSAPP-MANAGER] Error obteniendo estado:', e);
                    setAlertModal({
                      isOpen: true,
                      title: 'Error',
                      message: e?.message || 'Error al procesar la solicitud',
                      type: 'error',
                    });
                  } finally {
                    setCheckingDeliveryStatus(false);
                  }
                }}
                disabled={checkingDeliveryStatus || !deliveryStatusForm.message_id.trim()}
                className="px-4 py-2 rounded-lg font-medium text-white bg-[#5DE1E5] hover:bg-[#4BC4C7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {checkingDeliveryStatus ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Consultando...</span>
                  </>
                ) : (
                  <span>Consultar Estado</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para obtener información del número */}
      {showPhoneInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Obtener Información del Número</h2>
              <p className="text-sm text-gray-600 mt-1">Consulta información y estado de un número de teléfono</p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Teléfono *
                </label>
                <input
                  type="text"
                  value={phoneInfoForm.phone_number}
                  onChange={(e) => setPhoneInfoForm({ ...phoneInfoForm, phone_number: e.target.value })}
                  placeholder="573001234567"
                  disabled={checkingPhoneInfo}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 break-words overflow-wrap-anywhere">
                  Incluye el código de país sin el símbolo + (ej: 57 para Colombia, 1 para USA)
                </p>
              </div>

              {phoneInfoResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Información del Número:</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Phone Number ID:</span>{' '}
                      <span className="text-gray-900 font-mono text-xs break-all">{phoneInfoResult.phone_number_id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Número Mostrado:</span>{' '}
                      <span className="text-gray-900">{phoneInfoResult.display_phone_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Nombre Verificado:</span>{' '}
                      <span className="text-gray-900">{phoneInfoResult.verified_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Estado de Verificación:</span>{' '}
                      <span className={`font-semibold ${
                        phoneInfoResult.verification_status === 'VERIFIED' ? 'text-green-600' :
                        phoneInfoResult.verification_status === 'PENDING' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {phoneInfoResult.verification_status || 'N/A'}
                      </span>
                    </div>
                    {phoneInfoResult.note && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800 break-words overflow-wrap-anywhere">
                        {phoneInfoResult.note}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowPhoneInfoModal(false);
                  setPhoneInfoForm({ phone_number: '' });
                  setPhoneInfoResult(null);
                }}
                disabled={checkingPhoneInfo}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cerrar
              </button>
              <button
                onClick={async () => {
                  if (!phoneInfoForm.phone_number.trim()) {
                    setAlertModal({
                      isOpen: true,
                      title: 'Campo requerido',
                      message: 'Por favor ingresa el número de teléfono',
                      type: 'warning',
                    });
                    return;
                  }

                  setCheckingPhoneInfo(true);
                  try {
                    const res = await fetch('/api/whatsapp/get-phone-info', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        agent_id: selectedAgent?.id,
                        phone_number: phoneInfoForm.phone_number.trim(),
                      }),
                    });

                    const data = await res.json();

                    if (data.ok) {
                      setPhoneInfoResult(data.data);
                    } else {
                      setAlertModal({
                        isOpen: true,
                        title: 'Error',
                        message: data.error || 'Error al obtener información del número',
                        type: 'error',
                      });
                    }
                  } catch (e: any) {
                    console.error('[WHATSAPP-MANAGER] Error obteniendo información:', e);
                    setAlertModal({
                      isOpen: true,
                      title: 'Error',
                      message: e?.message || 'Error al procesar la solicitud',
                      type: 'error',
                    });
                  } finally {
                    setCheckingPhoneInfo(false);
                  }
                }}
                disabled={checkingPhoneInfo || !phoneInfoForm.phone_number.trim()}
                className="px-4 py-2 rounded-lg font-medium text-white bg-[#5DE1E5] hover:bg-[#4BC4C7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {checkingPhoneInfo ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Consultando...</span>
                  </>
                ) : (
                  <span>Consultar Información</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para obtener media */}
      {showGetMediaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Obtener Media</h2>
              <p className="text-sm text-gray-600 mt-1">Descarga imágenes, documentos u otros archivos multimedia</p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Media ID *
                </label>
                <input
                  type="text"
                  value={mediaForm.media_id}
                  onChange={(e) => setMediaForm({ ...mediaForm, media_id: e.target.value })}
                  placeholder="xxxxx"
                  disabled={gettingMedia}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 break-words overflow-wrap-anywhere">
                  El Media ID se obtiene de los mensajes recibidos o enviados. Los media expiran después de cierto tiempo.
                </p>
              </div>

              {mediaResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Media Obtenido:</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Media ID:</span>{' '}
                      <span className="text-gray-900 font-mono text-xs break-all">{mediaResult.media_id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tipo MIME:</span>{' '}
                      <span className="text-gray-900">{mediaResult.mime_type || 'N/A'}</span>
                    </div>
                    {mediaResult.file_size && (
                      <div>
                        <span className="font-medium text-gray-700">Tamaño:</span>{' '}
                        <span className="text-gray-900">{(mediaResult.file_size / 1024).toFixed(2)} KB</span>
                      </div>
                    )}
                    {mediaResult.data_url && (
                      <div className="mt-4">
                        {mediaResult.mime_type?.startsWith('image/') && (
                          <img
                            src={mediaResult.data_url}
                            alt="Media descargado"
                            className="max-w-full h-auto rounded-lg border border-gray-200"
                          />
                        )}
                        {mediaResult.mime_type?.startsWith('video/') && (
                          <video
                            src={mediaResult.data_url}
                            controls
                            className="max-w-full h-auto rounded-lg border border-gray-200"
                          />
                        )}
                        {!mediaResult.mime_type?.startsWith('image/') && !mediaResult.mime_type?.startsWith('video/') && (
                          <div className="p-4 bg-gray-100 rounded-lg text-center">
                            <p className="text-sm text-gray-600 mb-2">Archivo descargado</p>
                            <a
                              href={mediaResult.data_url}
                              download
                              className="text-[#5DE1E5] hover:text-[#4BC4C7] font-medium underline"
                            >
                              Descargar archivo
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowGetMediaModal(false);
                  setMediaForm({ media_id: '' });
                  setMediaResult(null);
                }}
                disabled={gettingMedia}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cerrar
              </button>
              <button
                onClick={async () => {
                  if (!mediaForm.media_id.trim()) {
                    setAlertModal({
                      isOpen: true,
                      title: 'Campo requerido',
                      message: 'Por favor ingresa el Media ID',
                      type: 'warning',
                    });
                    return;
                  }

                  setGettingMedia(true);
                  try {
                    const res = await fetch('/api/whatsapp/get-media', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        agent_id: selectedAgent?.id,
                        media_id: mediaForm.media_id.trim(),
                      }),
                    });

                    const data = await res.json();

                    if (data.ok) {
                      setMediaResult(data.data);
                    } else {
                      setAlertModal({
                        isOpen: true,
                        title: 'Error',
                        message: data.error || 'Error al obtener el media',
                        type: 'error',
                      });
                    }
                  } catch (e: any) {
                    console.error('[WHATSAPP-MANAGER] Error obteniendo media:', e);
                    setAlertModal({
                      isOpen: true,
                      title: 'Error',
                      message: e?.message || 'Error al procesar la solicitud',
                      type: 'error',
                    });
                  } finally {
                    setGettingMedia(false);
                  }
                }}
                disabled={gettingMedia || !mediaForm.media_id.trim()}
                className="px-4 py-2 rounded-lg font-medium text-white bg-[#5DE1E5] hover:bg-[#4BC4C7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {gettingMedia ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Descargando...</span>
                  </>
                ) : (
                  <span>Obtener Media</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

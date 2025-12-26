import { useState, useEffect, useCallback } from 'react';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import { getUserId } from '@/utils/permissions';
import { 
  Conversation, 
  Message, 
  PendingMessage, 
  HumanModeStatus,
  AgentDB,
  groupDocumentsIntoConversations 
} from '../utils/omnicanalidad-helpers';

const INDEX_UID = 'bd_conversations_dworkers';

export function useOmnicanalidad() {
  const [allPlatformAgents, setAllPlatformAgents] = useState<AgentDB[]>([]);
  const [agentsInitialized, setAgentsInitialized] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedPlatformAgent, setSelectedPlatformAgent] = useState<string>('all');
  const [currentAgentDetails, setCurrentAgentDetails] = useState<AgentDB | null>(null);
  const [humanModeStatus, setHumanModeStatus] = useState<HumanModeStatus | null>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [takingConversation, setTakingConversation] = useState(false);
  const [releasingConversation, setReleasingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageInput, setMessageInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState<string>(new Date().toISOString());
  const [conversationLastSeen, setConversationLastSeen] = useState<Map<string, string>>(new Map());
  const [hasNewMessages, setHasNewMessages] = useState<Set<string>>(new Set());

  // Calcular fechas por defecto
  const getDefaultDates = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    
    const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return { firstDayStr, todayStr };
  };

  const defaultDates = getDefaultDates();
  const [dateFrom, setDateFrom] = useState<string>(defaultDates.firstDayStr);
  const [dateTo, setDateTo] = useState<string>(defaultDates.todayStr);

  // Cargar agentes
  useEffect(() => {
    const loadAgents = async () => {
      try {
        console.log('[OMNICANALIDAD] Cargando agentes...');
        const res = await fetch('/api/agents');
        const data = await res.json();
        let list: AgentDB[] = data.ok ? data.agents : [];
        list = list.filter(a => a.conversation_agent_name && a.conversation_agent_name.trim() !== '');
        setAllPlatformAgents(list);
        console.log('[OMNICANALIDAD] Agentes cargados:', list.length);
      } catch (e) {
        console.error('[OMNICANALIDAD] Error cargando agentes:', e);
      } finally {
        setAgentsInitialized(true);
      }
    };
    loadAgents();
  }, []);

  // Actualizar selectedAgent cuando cambia selectedPlatformAgent
  useEffect(() => {
    if (selectedPlatformAgent !== 'all' && selectedPlatformAgent) {
      const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
      if (agent?.conversation_agent_name) {
        loadConversations(agent.conversation_agent_name);
      }
    } else {
      setConversations([]);
      setSelectedConversation(null);
    }
  }, [selectedPlatformAgent, allPlatformAgents]);

  // Cargar detalles del agente cuando se selecciona
  useEffect(() => {
    if (selectedPlatformAgent && selectedPlatformAgent !== 'all') {
      const agentId = parseInt(selectedPlatformAgent);
      loadAgentDetails(agentId);
    } else {
      setCurrentAgentDetails(null);
    }
  }, [selectedPlatformAgent]);

  // Cargar estado de modo humano cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversation && currentAgentDetails) {
      loadHumanModeStatus();
      
      // Remover icono de nuevo mensaje al abrir conversación
      setHasNewMessages(prev => {
        if (prev.has(selectedConversation.id)) {
          const newSet = new Set(prev);
          newSet.delete(selectedConversation.id);
          return newSet;
        }
        return prev;
      });
      
      // Actualizar conversationLastSeen
      setConversationLastSeen(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedConversation.id, new Date().toISOString());
        return newMap;
      });
    } else {
      setHumanModeStatus(null);
      setMessageInput('');
      setPendingMessages([]);
    }
  }, [selectedConversation?.id, currentAgentDetails]);

  const loadAgentDetails = async (agentId: number) => {
    try {
      console.log('[OMNICANALIDAD] Cargando detalles del agente:', agentId);
      const res = await fetch(`/api/agents/${agentId}`);
      const data = await res.json();
      if (data.ok && data.agent) {
        setCurrentAgentDetails(data.agent);
        console.log('[OMNICANALIDAD] Detalles del agente cargados:', data.agent.name);
      }
    } catch (e) {
      console.error('[OMNICANALIDAD] Error cargando detalles del agente:', e);
    }
  };

  const loadHumanModeStatus = async () => {
    if (!selectedConversation || !currentAgentDetails) {
      setHumanModeStatus(null);
      return;
    }

    try {
      const userId = selectedConversation.user_id;
      const phoneNumberId = selectedConversation.phone_number_id || '';
      
      console.log('[OMNICANALIDAD] Cargando estado de modo humano:', {
        agent_id: currentAgentDetails.id,
        user_id: userId,
        phone_number_id: phoneNumberId
      });
      
      const res = await fetch(
        `/api/conversations/status?agent_id=${currentAgentDetails.id}&user_id=${encodeURIComponent(userId)}&phone_number_id=${encodeURIComponent(phoneNumberId)}`
      );
      const data = await res.json();
      
      if (data.ok) {
        setHumanModeStatus({
          isHumanMode: data.isHumanMode === true,
          takenBy: data.takenBy,
          takenAt: data.takenAt
        });
        console.log('[OMNICANALIDAD] Estado de modo humano cargado:', {
          isHumanMode: data.isHumanMode === true,
          takenBy: data.takenBy,
          takenAt: data.takenAt
        });
      } else {
        setHumanModeStatus({
          isHumanMode: false,
          takenBy: undefined,
          takenAt: undefined
        });
      }
    } catch (e) {
      console.error('[OMNICANALIDAD] Error cargando estado de modo humano:', e);
      setHumanModeStatus({
        isHumanMode: false,
        takenBy: undefined,
        takenAt: undefined
      });
    }
  };

  const loadConversations = async (selectedAgent: string) => {
    if (!selectedAgent || selectedAgent === 'all') {
      setConversations([]);
      return;
    }

    try {
      setLoadingConversations(true);
      console.log('[OMNICANALIDAD] Cargando conversaciones del agente:', selectedAgent);
      
      const allDocuments: Document[] = [];
      
      let currentOffset = 0;
      const batchLimit = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const data = await meilisearchAPI.getDocuments(INDEX_UID, batchLimit, currentOffset);
        
        const filtered = data.results.filter((doc: Document) => {
          const isAgent = doc.agent === selectedAgent;
          const isTypeAgent = doc.type === 'agent' || doc.type === 'user';
          
          let isInDateRange = true;
          if (dateFrom && doc.datetime) {
            const docDate = new Date(doc.datetime);
            const fromDate = new Date(dateFrom + 'T00:00:00');
            const toDate = new Date(dateTo + 'T23:59:59');
            isInDateRange = docDate >= fromDate && docDate <= toDate;
          }
          
          return isAgent && isTypeAgent && isInDateRange;
        });
        
        allDocuments.push(...filtered);
        
        if (data.results.length < batchLimit) {
          hasMore = false;
        } else {
          currentOffset += batchLimit;
        }
      }
      
      console.log('[OMNICANALIDAD] Total de documentos cargados:', allDocuments.length);
      
      const groupedConversations = groupDocumentsIntoConversations(allDocuments, selectedAgent);
      
      // Filtrar por búsqueda si hay
      let filteredConversations = groupedConversations;
      if (searchQuery && searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        filteredConversations = groupedConversations.filter(group => {
          return group.user_id.toLowerCase().includes(queryLower) ||
                 group.phone_number_id.toLowerCase().includes(queryLower) ||
                 group.lastMessage.toLowerCase().includes(queryLower) ||
                 group.messages.some(message => message.content.toLowerCase().includes(queryLower));
        });
      }
      
      setConversations(filteredConversations);
      
      // Guardar lastCheckTimestamp después de cargar
      setLastCheckTimestamp(new Date().toISOString());
      
      // Inicializar conversationLastSeen con timestamps actuales
      const newLastSeen = new Map<string, string>();
      filteredConversations.forEach(conv => {
        newLastSeen.set(conv.id, conv.lastMessageTime);
      });
      setConversationLastSeen(newLastSeen);
      
      // Limpiar hasNewMessages al cargar inicialmente
      setHasNewMessages(new Set());
      
      // Auto-seleccionar la primera conversación si hay resultados
      if (filteredConversations.length > 0) {
        const currentStillExists = filteredConversations.find(g => g.id === selectedConversation?.id);
        if (currentStillExists) {
          setSelectedConversation(currentStillExists);
        } else {
          setSelectedConversation(filteredConversations[0]);
        }
      } else {
        setSelectedConversation(null);
      }
    } catch (err) {
      console.error('[OMNICANALIDAD] Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleTakeConversation = async () => {
    if (!selectedConversation || !currentAgentDetails) return;

    const userId = getUserId();
    if (!userId) {
      console.error('[OMNICANALIDAD] No se pudo identificar al usuario');
      return;
    }

    if (!currentAgentDetails.whatsapp_phone_number_id) {
      console.error('[OMNICANALIDAD] El agente no tiene configuración completa de WhatsApp');
      return;
    }

    setTakingConversation(true);
    try {
      console.log('[OMNICANALIDAD] Tomando conversación:', {
        agent_id: currentAgentDetails.id,
        user_id: selectedConversation.user_id,
        phone_number_id: selectedConversation.phone_number_id
      });
      
      const res = await fetch('/api/conversations/take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: currentAgentDetails.id,
          user_id: selectedConversation.user_id,
          phone_number_id: selectedConversation.phone_number_id || '',
          taken_by: parseInt(userId)
        })
      });

      const data = await res.json();
      
      if (data.ok) {
        await loadHumanModeStatus();
        console.log('[OMNICANALIDAD] Conversación tomada exitosamente');
      } else {
        console.error('[OMNICANALIDAD] Error al tomar conversación:', data.error);
      }
    } catch (e: any) {
      console.error('[OMNICANALIDAD] Error tomando conversación:', e);
    } finally {
      setTakingConversation(false);
    }
  };

  // Función para actualizar una conversación en la lista sin recargar todo
  const updateConversationInList = useCallback((conversationId: string, updates: Partial<Conversation>) => {
    console.log('[OMNICANALIDAD] [updateConversationInList] INICIO - conversationId:', conversationId, 'updates:', updates);
    
    setConversations(prev => {
      console.log('[OMNICANALIDAD] [updateConversationInList] Estado anterior - total conversaciones:', prev.length);
      console.log('[OMNICANALIDAD] [updateConversationInList] Buscando conversación con ID:', conversationId);
      
      const found = prev.find(c => c.id === conversationId);
      console.log('[OMNICANALIDAD] [updateConversationInList] Conversación encontrada:', !!found, found ? { id: found.id, lastMessage: found.lastMessage } : 'NO ENCONTRADA');
      
      const updated = prev.map(conv => {
        if (conv.id === conversationId) {
          const merged = { ...conv, ...updates };
          console.log('[OMNICANALIDAD] [updateConversationInList] Conversación actualizada:', { id: merged.id, lastMessage: merged.lastMessage, lastMessageTime: merged.lastMessageTime });
          return merged;
        }
        return conv;
      });
      
      // Mover la conversación actualizada al principio si tiene nuevo mensaje
      const updatedConv = updated.find(c => c.id === conversationId);
      if (updatedConv) {
        const filtered = updated.filter(c => c.id !== conversationId);
        const reordered = [updatedConv, ...filtered];
        console.log('[OMNICANALIDAD] [updateConversationInList] Reordenando - nueva conversación al principio:', reordered[0]?.id);
        console.log('[OMNICANALIDAD] [updateConversationInList] Total después de reordenar:', reordered.length);
        return reordered;
      }
      
      console.log('[OMNICANALIDAD] [updateConversationInList] No se encontró conversación actualizada, retornando sin cambios');
      return updated;
    });
    
    // Actualizar selectedConversation si es la misma
    setSelectedConversation(prev => {
      if (prev?.id === conversationId) {
        const merged = { ...prev, ...updates };
        console.log('[OMNICANALIDAD] [updateConversationInList] Actualizando selectedConversation:', { id: merged.id, lastMessage: merged.lastMessage });
        return merged;
      }
      console.log('[OMNICANALIDAD] [updateConversationInList] selectedConversation no coincide, no se actualiza');
      return prev;
    });
    
    console.log('[OMNICANALIDAD] [updateConversationInList] FIN');
  }, []);

  // Función para verificar actualizaciones (polling)
  const checkForUpdates = useCallback(async () => {
    console.log('[OMNICANALIDAD] [checkForUpdates] INICIO');
    console.log('[OMNICANALIDAD] [checkForUpdates] selectedPlatformAgent:', selectedPlatformAgent);
    console.log('[OMNICANALIDAD] [checkForUpdates] lastCheckTimestamp:', lastCheckTimestamp);
    
    if (!selectedPlatformAgent || selectedPlatformAgent === 'all') {
      console.log('[OMNICANALIDAD] [checkForUpdates] SALIDA TEMPRANA - No hay agente seleccionado');
      return;
    }
    
    const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
    console.log('[OMNICANALIDAD] [checkForUpdates] Agente encontrado:', agent ? { id: agent.id, name: agent.name, conversation_agent_name: agent.conversation_agent_name } : 'NO ENCONTRADO');
    
    if (!agent?.conversation_agent_name) {
      console.log('[OMNICANALIDAD] [checkForUpdates] SALIDA TEMPRANA - Agente sin conversation_agent_name');
      return;
    }

    try {
      const url = `/api/omnicanalidad/check-updates?agent_name=${encodeURIComponent(agent.conversation_agent_name)}&lastCheckTimestamp=${encodeURIComponent(lastCheckTimestamp)}`;
      console.log('[OMNICANALIDAD] [checkForUpdates] Llamando a:', url);
      
      const res = await fetch(url);
      console.log('[OMNICANALIDAD] [checkForUpdates] Respuesta recibida, status:', res.status);
      
      const data = await res.json();
      console.log('[OMNICANALIDAD] [checkForUpdates] Datos recibidos:', {
        ok: data.ok,
        updatedConversationsCount: data.updatedConversations?.length || 0,
        hasNewMessages: !!data.newMessages,
        newMessagesKeys: data.newMessages ? Object.keys(data.newMessages) : []
      });

      if (data.ok && data.updatedConversations && data.updatedConversations.length > 0) {
        console.log('[OMNICANALIDAD] [checkForUpdates] Conversaciones actualizadas detectadas:', data.updatedConversations.length);
        console.log('[OMNICANALIDAD] [checkForUpdates] IDs de conversaciones actualizadas:', data.updatedConversations);
        
        // Para cada conversación actualizada
        data.updatedConversations.forEach((convId: string) => {
          console.log('[OMNICANALIDAD] [checkForUpdates] Procesando conversación:', convId);
          const newMessageData = data.newMessages[convId];
          console.log('[OMNICANALIDAD] [checkForUpdates] Datos de nuevo mensaje para', convId, ':', newMessageData);
          
          if (newMessageData) {
            console.log('[OMNICANALIDAD] [checkForUpdates] Llamando updateConversationInList para:', convId);
            // Actualizar la conversación en la lista
            updateConversationInList(convId, {
              lastMessage: newMessageData.lastMessage,
              lastMessageTime: newMessageData.lastMessageTime
            });
            
            // Si la conversación NO está abierta, marcar con icono de nuevo mensaje
            const isOpen = selectedConversation?.id === convId;
            console.log('[OMNICANALIDAD] [checkForUpdates] Conversación abierta?', isOpen, 'selectedConversation?.id:', selectedConversation?.id);
            
            if (!isOpen) {
              console.log('[OMNICANALIDAD] [checkForUpdates] Agregando icono de nuevo mensaje para:', convId);
              setHasNewMessages(prev => {
                const newSet = new Set(prev);
                newSet.add(convId);
                console.log('[OMNICANALIDAD] [checkForUpdates] hasNewMessages actualizado, total:', newSet.size, 'IDs:', Array.from(newSet));
                return newSet;
              });
            } else {
              console.log('[OMNICANALIDAD] [checkForUpdates] Conversación está abierta, no se agrega icono');
            }
          } else {
            console.log('[OMNICANALIDAD] [checkForUpdates] NO hay datos de nuevo mensaje para:', convId);
          }
        });
        
        // Actualizar lastCheckTimestamp
        console.log('[OMNICANALIDAD] [checkForUpdates] Actualizando lastCheckTimestamp a:', data.lastCheckTimestamp);
        setLastCheckTimestamp(data.lastCheckTimestamp);
      } else {
        console.log('[OMNICANALIDAD] [checkForUpdates] No hay conversaciones actualizadas o respuesta no ok');
      }
    } catch (e) {
      console.error('[OMNICANALIDAD] [checkForUpdates] ERROR:', e);
    }
    
    console.log('[OMNICANALIDAD] [checkForUpdates] FIN');
  }, [selectedPlatformAgent, allPlatformAgents, lastCheckTimestamp, selectedConversation?.id, updateConversationInList]);

  // Polling cada 10 segundos
  useEffect(() => {
    console.log('[OMNICANALIDAD] [POLLING] Configurando polling, selectedPlatformAgent:', selectedPlatformAgent);
    
    if (!selectedPlatformAgent || selectedPlatformAgent === 'all') {
      console.log('[OMNICANALIDAD] [POLLING] No se configura polling - no hay agente seleccionado');
      return;
    }
    
    console.log('[OMNICANALIDAD] [POLLING] Polling configurado, se ejecutará cada 10 segundos');
    
    const interval = setInterval(() => {
      console.log('[OMNICANALIDAD] [POLLING] Ejecutando polling...');
      checkForUpdates();
    }, 10000); // 10 segundos

    return () => {
      console.log('[OMNICANALIDAD] [POLLING] Limpiando intervalo de polling');
      clearInterval(interval);
    };
  }, [selectedPlatformAgent, checkForUpdates]);

  const handleReleaseConversation = async () => {
    if (!selectedConversation || !currentAgentDetails) return;

    setReleasingConversation(true);
    try {
      console.log('[OMNICANALIDAD] Liberando conversación:', {
        agent_id: currentAgentDetails.id,
        user_id: selectedConversation.user_id,
        phone_number_id: selectedConversation.phone_number_id
      });
      
      const res = await fetch('/api/conversations/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: currentAgentDetails.id,
          user_id: selectedConversation.user_id,
          phone_number_id: selectedConversation.phone_number_id || ''
        })
      });

      const data = await res.json();
      
      if (data.ok) {
        setHumanModeStatus({ isHumanMode: false });
        setMessageInput('');
        setPendingMessages([]);
        console.log('[OMNICANALIDAD] Conversación liberada exitosamente');
      } else {
        console.error('[OMNICANALIDAD] Error al liberar conversación:', data.error);
      }
    } catch (e: any) {
      console.error('[OMNICANALIDAD] Error liberando conversación:', e);
    } finally {
      setReleasingConversation(false);
    }
  };

  const handleSendMessage = async () => {
    console.log('[OMNICANALIDAD] handleSendMessage llamado:', {
      selectedConversation: !!selectedConversation,
      currentAgentDetails: !!currentAgentDetails,
      humanModeStatus: humanModeStatus,
      isHumanMode: humanModeStatus?.isHumanMode,
      messageInput: messageInput?.trim()?.substring(0, 20)
    });
    
    if (!selectedConversation || !currentAgentDetails) {
      console.error('[OMNICANALIDAD] Error: Falta selectedConversation o currentAgentDetails');
      return;
    }
    
    if (!humanModeStatus?.isHumanMode) {
      console.error('[OMNICANALIDAD] Error: No está en modo humano', humanModeStatus);
      return;
    }

    if (!messageInput.trim()) {
      console.error('[OMNICANALIDAD] Error: Mensaje vacío');
      return;
    }

    const phoneNumber = selectedConversation.phone_number_id || selectedConversation.user_id;
    if (!phoneNumber) {
      console.error('[OMNICANALIDAD] Error: No hay número de teléfono');
      return;
    }

    const messageText = messageInput.trim();
    const messageId = `pending-${Date.now()}-${Math.random()}`;
    
    console.log('[OMNICANALIDAD] Agregando mensaje a pendingMessages:', {
      id: messageId,
      message: messageText.substring(0, 50),
      status: 'sending'
    });
    
    const pendingMessage: PendingMessage = {
      id: messageId,
      message: messageText,
      status: 'sending',
      timestamp: new Date().toISOString()
    };
    
    setPendingMessages(prev => {
      const updated = [...prev, pendingMessage];
      console.log('[OMNICANALIDAD] pendingMessages actualizado:', updated.length, 'mensajes');
      return updated;
    });
    setMessageInput('');
    setSendingMessage(true);

    try {
      console.log('[OMNICANALIDAD] Enviando mensaje a WhatsApp API:', {
        agent_id: currentAgentDetails.id,
        phone_number: phoneNumber,
        message_length: messageText.length
      });
      
      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: currentAgentDetails.id,
          phone_number: phoneNumber,
          message_type: 'text',
          message: messageText,
          user_id: selectedConversation.user_id,
          phone_number_id: selectedConversation.phone_number_id || selectedConversation.user_id
        })
      });

      const data = await res.json();
      
      console.log('[OMNICANALIDAD] Respuesta del API:', {
        ok: data.ok,
        hasData: !!data.data,
        error: data.error
      });
      
      if (data.ok && data.data) {
        // Actualizar pending message
        setPendingMessages(prev => {
          const updated = prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, status: 'sent' as const, messageId: data.data.message_id }
              : msg
          );
          console.log('[OMNICANALIDAD] pendingMessages actualizado después de enviar:', updated.length, 'mensajes');
          return updated;
        });
        
        // Agregar mensaje directamente a la conversación actual
        if (selectedConversation) {
          console.log('[OMNICANALIDAD] [handleSendMessage] Agregando mensaje a selectedConversation, ID:', selectedConversation.id);
          
          const newMessage: Message = {
            id: data.data.message_id || messageId,
            type: 'agent',
            content: messageText,
            timestamp: new Date().toISOString(),
            status: 'sent',
          };
          
          const updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, newMessage],
            lastMessage: messageText.substring(0, 50),
            lastMessageTime: new Date().toISOString()
          };
          
          console.log('[OMNICANALIDAD] [handleSendMessage] Actualizando selectedConversation con nuevo mensaje, total mensajes:', updatedConversation.messages.length);
          setSelectedConversation(updatedConversation);
          
          // Actualizar solo esta conversación en la lista izquierda
          console.log('[OMNICANALIDAD] [handleSendMessage] Llamando updateConversationInList para actualizar lista izquierda');
          updateConversationInList(selectedConversation.id, {
            lastMessage: messageText.substring(0, 50),
            lastMessageTime: new Date().toISOString()
          });
          
          console.log('[OMNICANALIDAD] [handleSendMessage] Mensaje agregado directamente a la conversación');
        } else {
          console.log('[OMNICANALIDAD] [handleSendMessage] ERROR: selectedConversation es null, no se puede actualizar');
        }
        
        // Actualizar lastCheckTimestamp
        const newTimestamp = new Date().toISOString();
        console.log('[OMNICANALIDAD] [handleSendMessage] Actualizando lastCheckTimestamp a:', newTimestamp);
        setLastCheckTimestamp(newTimestamp);
        
        console.log('[OMNICANALIDAD] [handleSendMessage] Mensaje enviado exitosamente, guardado en Meilisearch');
        
        // NO recargar todas las conversaciones - solo actualizamos la actual
      } else {
        setPendingMessages(prev => {
          const updated = prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, status: 'error' as const }
              : msg
          );
          console.log('[OMNICANALIDAD] pendingMessages actualizado con error:', updated.length, 'mensajes');
          return updated;
        });
        console.error('[OMNICANALIDAD] Error al enviar mensaje:', data.error || 'Error desconocido');
      }
    } catch (e: any) {
      console.error('[OMNICANALIDAD] Error enviando mensaje:', e);
      setPendingMessages(prev => {
        const updated = prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'error' as const }
            : msg
        );
        return updated;
      });
    } finally {
      setSendingMessage(false);
    }
  };

  return {
    // Estado
    allPlatformAgents,
    agentsInitialized,
    conversations,
    selectedConversation,
    setSelectedConversation,
    selectedPlatformAgent,
    setSelectedPlatformAgent,
    currentAgentDetails,
    humanModeStatus,
    pendingMessages,
    loadingConversations,
    takingConversation,
    releasingConversation,
    sendingMessage,
    messageInput,
    setMessageInput,
    searchQuery,
    setSearchQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    
    // Acciones
    handleTakeConversation,
    handleReleaseConversation,
    handleSendMessage,
    loadConversations,
    
    // Nuevos estados para actualización inteligente
    hasNewMessages
  };
}


'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Conversation, Message } from '../utils/types';
import { getUserId } from '@/utils/permissions';

interface UseConversationsReturn {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  loadingMessages: boolean;
  selectedAgentName: string | null;
  totalUnreadCount: number;
  loadConversations: (agentName?: string) => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, message: string) => Promise<void>;
  setSelectedAgentName: (agentName: string | null) => void;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedAgentName, setSelectedAgentName] = useState<string | null>(null);
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState<string>(new Date().toISOString());
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const readByRef = useRef<string | null>(null);

  // Obtener client_id del usuario
  useEffect(() => {
    const userId = getUserId();
    readByRef.current = userId;
  }, []);

  // Cargar conversaciones
  const loadConversations = useCallback(async (agentName?: string) => {
    if (!readByRef.current) {
      console.log('[useConversations] No hay read_by disponible');
      return;
    }

    try {
      setLoading(true);
      const agent = agentName || selectedAgentName;
      if (!agent) {
        console.log('[useConversations] No hay agente seleccionado');
        setLoading(false);
        return;
      }

      console.log('[useConversations] Cargando conversaciones para agente:', agent);

      const params = new URLSearchParams({
        agent_name: agent,
        limit: '50',
        offset: '0',
        read_by: readByRef.current
      });

      const response = await fetch(`/api/omnicanalidad/conversations?${params}`);
      const data = await response.json();

      if (data.ok && data.conversations) {
        console.log('[useConversations] Conversaciones cargadas:', data.conversations.length);
        setConversations(data.conversations);
        setLastCheckTimestamp(new Date().toISOString());
      } else {
        console.error('[useConversations] Error cargando conversaciones:', data.error);
      }
    } catch (e: any) {
      console.error('[useConversations] Error en loadConversations:', e?.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAgentName]);

  // Seleccionar conversación y cargar mensajes
  const selectConversation = useCallback(async (conversationId: string) => {
    if (!readByRef.current || !selectedAgentName) {
      console.log('[useConversations] No hay read_by o agente seleccionado');
      return;
    }

    try {
      setLoadingMessages(true);
      
      // Encontrar la conversación en la lista
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
      }

      console.log('[useConversations] Cargando mensajes para conversación:', conversationId);

      const params = new URLSearchParams({
        conversation_id: conversationId,
        agent_name: selectedAgentName,
        read_by: readByRef.current
      });

      const response = await fetch(`/api/omnicanalidad/messages?${params}`);
      const data = await response.json();

      if (data.ok && data.messages) {
        console.log('[useConversations] Mensajes cargados:', data.messages.length);
        setMessages(data.messages);
        
        // Actualizar unreadCount de la conversación en la lista
        setConversations(prev => prev.map(c => 
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ));
      } else {
        console.error('[useConversations] Error cargando mensajes:', data.error);
      }
    } catch (e: any) {
      console.error('[useConversations] Error en selectConversation:', e?.message);
    } finally {
      setLoadingMessages(false);
    }
  }, [conversations, selectedAgentName]);

  // Enviar mensaje
  const sendMessage = useCallback(async (conversationId: string, message: string) => {
    if (!selectedAgentName || !readByRef.current) {
      console.log('[useConversations] No hay agente o read_by disponible');
      throw new Error('No hay agente seleccionado');
    }

    try {
      // Parsear conversation_id para extraer user_id y phone_number_id
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv || !conv.user_id) {
        console.error('[useConversations] No se pudo encontrar la conversación o user_id');
        throw new Error('Conversación no encontrada');
      }

      // Obtener agent_id
      const agentsResponse = await fetch('/api/agents');
      const agentsData = await agentsResponse.json();
      const agent = agentsData.agents?.find((a: any) => a.conversation_agent_name === selectedAgentName);
      
      if (!agent) {
        console.error('[useConversations] Agente no encontrado');
        throw new Error('Agente no encontrado');
      }

      // Extraer phone_number del phone_number_id o usar el user_id como phone_number
      const phoneNumber = conv.phone_number_id || conv.user_id;

      // Enviar mensaje a través de WhatsApp API
      const sendResponse = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agent.id,
          phone_number: phoneNumber,
          phone_number_id: conv.phone_number_id || '',
          user_id: conv.user_id,
          message: message,
          message_type: 'text'
        })
      });

      const sendData = await sendResponse.json();

      if (sendData.ok) {
        console.log('[useConversations] Mensaje enviado exitosamente');
        
        // Agregar mensaje localmente
        const newMessage: Message = {
          id: `temp_${Date.now()}`,
          type: 'agent',
          content: message,
          datetime: new Date().toISOString(),
          status: 'sent'
        };

        setMessages(prev => [...prev, newMessage]);
        
        // Actualizar último mensaje en la lista de conversaciones
        setConversations(prev => prev.map(c => 
          c.id === conversationId 
            ? { 
                ...c, 
                lastMessage: message.length > 60 ? message.substring(0, 60) + '...' : message,
                lastMessageTime: new Date().toISOString(),
                unreadCount: 0
              } 
            : c
        ));

        // Actualizar lastCheckTimestamp para que el polling detecte el nuevo mensaje
        setLastCheckTimestamp(new Date(Date.now() - 1000).toISOString());
      } else {
        console.error('[useConversations] Error enviando mensaje:', sendData.error);
        throw new Error(sendData.error || 'Error enviando mensaje');
      }
    } catch (e: any) {
      console.error('[useConversations] Error en sendMessage:', e?.message);
      throw e;
    }
  }, [conversations, selectedAgentName]);

  // Verificar actualizaciones (polling)
  const checkForUpdates = useCallback(async () => {
    if (!selectedAgentName || !readByRef.current) {
      return;
    }

    try {
      const params = new URLSearchParams({
        agent_name: selectedAgentName,
        lastCheckTimestamp: lastCheckTimestamp,
        read_by: readByRef.current
      });

      const response = await fetch(`/api/omnicanalidad/check-updates?${params}`);
      const data = await response.json();

      if (data.ok) {
        if (data.updatedConversations && data.updatedConversations.length > 0) {
          console.log('[useConversations] Conversaciones actualizadas:', data.updatedConversations.length);
          
          // Recargar conversaciones para obtener los nuevos datos
          await loadConversations();
        }

        if (data.newMessages && data.newMessages.length > 0) {
          console.log('[useConversations] Nuevos mensajes detectados:', data.newMessages.length);
          
          // Actualizar unreadCount en las conversaciones afectadas
          setConversations(prev => prev.map(c => {
            const newMsg = data.newMessages.find((nm: any) => nm.conversationId === c.id);
            if (newMsg) {
              return { ...c, unreadCount: newMsg.unreadCount };
            }
            return c;
          }));

          // Si la conversación seleccionada tiene nuevos mensajes, recargar
          if (selectedConversation) {
            const hasNewMessages = data.newMessages.some((nm: any) => nm.conversationId === selectedConversation.id);
            if (hasNewMessages) {
              await selectConversation(selectedConversation.id);
            }
          }
        }

        setLastCheckTimestamp(new Date().toISOString());
      }
    } catch (e: any) {
      console.error('[useConversations] Error en checkForUpdates:', e?.message);
    }
  }, [selectedAgentName, lastCheckTimestamp, selectedConversation, loadConversations, selectConversation]);

  // Configurar polling
  useEffect(() => {
    if (selectedAgentName && readByRef.current) {
      // Limpiar intervalo anterior
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Configurar nuevo intervalo (cada 10 segundos)
      pollingIntervalRef.current = setInterval(() => {
        checkForUpdates();
      }, 10000);

      console.log('[useConversations] Polling configurado para agente:', selectedAgentName);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [selectedAgentName, checkForUpdates]);

  // Cargar conversaciones cuando cambia el agente
  // Limpiar conversaciones y mensajes cuando no hay agente seleccionado
  useEffect(() => {
    if (selectedAgentName && readByRef.current) {
      loadConversations();
    } else {
      // Limpiar conversaciones y mensajes cuando no hay agente seleccionado
      setConversations([]);
      setMessages([]);
      setSelectedConversation(null);
    }
  }, [selectedAgentName, loadConversations]);

  // Calcular total de no leídos
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  return {
    conversations,
    selectedConversation,
    messages,
    loading,
    loadingMessages,
    selectedAgentName,
    totalUnreadCount,
    loadConversations,
    selectConversation,
    sendMessage,
    setSelectedAgentName
  };
}


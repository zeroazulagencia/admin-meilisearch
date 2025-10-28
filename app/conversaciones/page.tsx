'use client';

import { useState, useEffect } from 'react';
import { meilisearchAPI, Document } from '@/utils/meilisearch';

interface ConversationGroup {
  user_id: string;
  phone_number_id: string;
  lastMessage: string;
  lastDate: string;
  messages: Document[];
}

export default function Conversaciones() {
  const [conversationGroups, setConversationGroups] = useState<ConversationGroup[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [agents, setAgents] = useState<string[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string>('');

  const INDEX_UID = 'bd_conversations_dworkers';

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent !== 'all') {
      loadConversations();
    }
  }, [selectedAgent]);

  const loadAgents = async () => {
    try {
      setLoadingAgents(true);
      console.log('Cargando todos los agentes...');
      
      const uniqueAgents = new Set<string>();
      let currentOffset = 0;
      const batchLimit = 1000;
      let hasMore = true;
      
      // Cargar TODOS los documentos por lotes
      while (hasMore) {
        console.log(`Cargando batch: offset ${currentOffset}`);
        const data = await meilisearchAPI.getDocuments(INDEX_UID, batchLimit, currentOffset);
        
        data.results.forEach((doc: Document) => {
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
      console.log(`Total de agentes encontrados: ${sortedAgents.length}`);
      
      setAgents(sortedAgents);
    } catch (err) {
      console.error('Error loading agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      console.log('Cargando conversaciones del agente:', selectedAgent);
      
      const allDocuments: Document[] = [];
      let currentOffset = 0;
      const batchLimit = 1000;
      let hasMore = true;
      
      // Cargar TODOS los documentos en lotes
      while (hasMore) {
        const data = await meilisearchAPI.getDocuments(INDEX_UID, batchLimit, currentOffset);
        
        // Filtrar por agente y por type === 'agent'
        const filtered = data.results.filter((doc: Document) => {
          const isAgent = doc.agent === selectedAgent;
          const isTypeAgent = doc.type === 'agent';
          return isAgent && isTypeAgent;
        });
        
        allDocuments.push(...filtered);
        
        if (data.results.length < batchLimit) {
          hasMore = false;
        } else {
          currentOffset += batchLimit;
        }
      }
      
      console.log(`Total de documentos cargados: ${allDocuments.length}`);
      console.log('Ejemplos de documentos:', allDocuments.slice(0, 3));
      
      // Agrupar por user_id, filtrando los que no tienen user_id, son null, vacío o 'unknown'
      const groups = new Map<string, Document[]>();
      
      allDocuments.forEach(doc => {
        // Procesar si tiene iduser válido (string o número, no null, undefined, vacío o 'unknown')
        const userIdRaw = doc.iduser || doc.user_id; // Intentar ambos nombres de campo
        
        if (userIdRaw !== null && userIdRaw !== undefined && userIdRaw !== '' && userIdRaw !== 'unknown') {
          // Convertir a string para usar como key
          const userId = String(userIdRaw);
          
          if (userId && userId.length > 0) {
            if (!groups.has(userId)) {
              groups.set(userId, []);
            }
            groups.get(userId)!.push(doc);
          }
        }
      });
      
      console.log(`Total de conversaciones agrupadas: ${groups.size}`);
      
      // Convertir a array y ordenar
      const conversationGroupsArray: ConversationGroup[] = Array.from(groups.entries()).map(([iduser, messages]) => {
        // Ordenar mensajes por datetime
        const sortedMessages = messages.sort((a, b) => {
          const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
          const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
          return dateA - dateB;
        });
        
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        const phoneId = lastMessage.phone_number_id || lastMessage.phone_id || '';
        
        // Obtener último mensaje de texto (Human o AI)
        let lastMessageText = '';
        if (lastMessage['message-Human']) {
          lastMessageText = lastMessage['message-Human'].substring(0, 50);
        } else if (lastMessage['message-AI']) {
          lastMessageText = lastMessage['message-AI'].substring(0, 50);
        }
        
        return {
          user_id: iduser,
          phone_number_id: phoneId,
          lastMessage: lastMessageText,
          lastDate: lastMessage.datetime || '',
          messages: sortedMessages
        };
      }).sort((a, b) => {
        const dateA = new Date(a.lastDate).getTime();
        const dateB = new Date(b.lastDate).getTime();
        return dateB - dateA; // Más reciente primero
      });
      
      console.log(`Total de conversaciones agrupadas: ${conversationGroupsArray.length}`);
      setConversationGroups(conversationGroupsArray);
      setCurrentAgent(selectedAgent);
      
      // Auto-seleccionar la primera conversación
      if (conversationGroupsArray.length > 0) {
        setSelectedConversation(conversationGroupsArray[0]);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAgent(e.target.value);
    setSelectedConversation(null);
    setConversationGroups([]);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Conversaciones</h1>
        
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <label className="text-sm font-medium text-gray-700">
            Seleccionar Agente:
          </label>
          <select
            value={selectedAgent}
            onChange={handleAgentChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm max-w-md"
          >
            <option value="all">Selecciona un agente...</option>
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        </div>

        {loadingAgents ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <p className="mt-2 text-gray-600">Cargando agentes...</p>
            </div>
          </div>
        ) : selectedAgent === 'all' ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Selecciona un agente para ver sus conversaciones</p>
          </div>
        ) : loadingConversations ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <p className="mt-2 text-gray-600">Cargando conversaciones...</p>
            </div>
          </div>
        ) : conversationGroups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay conversaciones disponibles</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
            <div className="flex h-full">
              {/* Panel Izquierdo - Lista de Conversaciones */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">{currentAgent}</h2>
                  <p className="text-sm text-gray-500">{conversationGroups.length} conversaciones</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {conversationGroups.map((group, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedConversation(group)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation?.user_id === group.user_id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-semibold text-gray-900">{group.user_id}</span>
                        <span className="text-xs text-gray-500">{formatTime(group.lastDate)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{group.phone_number_id}</p>
                      <p className="text-sm text-gray-600 truncate">{group.lastMessage}...</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel Derecho - Mensajes */}
              <div className="flex-1 flex flex-col bg-gray-100">
                {selectedConversation ? (
                  <>
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">{selectedConversation.user_id}</h3>
                      <p className="text-xs text-gray-500">{selectedConversation.phone_number_id}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedConversation.messages.map((message, index) => (
                        <div key={index} className="flex flex-col gap-1">
                          {/* Mensaje Human */}
                          {message['message-Human'] && (
                            <div className="flex justify-end">
                              <div className="max-w-[70%] bg-green-500 text-white rounded-lg px-4 py-2">
                                <p className="text-sm">{message['message-Human']}</p>
                                <p className="text-xs text-green-100 mt-1 text-right">
                                  {formatTime(message.datetime)}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Mensaje AI */}
                          {message['message-AI'] && (
                            <div className="flex justify-start">
                              <div className="max-w-[70%] bg-white rounded-lg px-4 py-2 shadow-sm">
                                <p className="text-sm text-gray-800">{message['message-AI']}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatTime(message.datetime)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500">Selecciona una conversación</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

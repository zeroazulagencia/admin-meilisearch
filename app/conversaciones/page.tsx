'use client';

import { useState, useEffect } from 'react';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import { getPermissions, getUserId } from '@/utils/permissions';

interface ConversationGroup {
  user_id: string;
  phone_number_id: string;
  lastMessage: string;
  lastDate: string;
  messages: Document[];
}

interface AgentDB {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  photo?: string;
  conversation_agent_name?: string;
}

export default function Conversaciones() {
  const [allPlatformAgents, setAllPlatformAgents] = useState<AgentDB[]>([]);
  const [agentsInitialized, setAgentsInitialized] = useState<boolean>(false);
  const [conversationGroups, setConversationGroups] = useState<ConversationGroup[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [agents, setAgents] = useState<string[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string>('');
  const [selectedPlatformAgent, setSelectedPlatformAgent] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const INDEX_UID = 'bd_conversations_dworkers';

  // Inicializar fechas con HOY como default
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    setDateFrom(todayStr);
    setDateTo(todayStr);
  }, []);

  useEffect(() => {
    if (selectedPlatformAgent !== 'all' && selectedPlatformAgent) {
      // Obtener el conversation_agent_name del agente seleccionado
      const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
      if (agent?.conversation_agent_name) {
        setSelectedAgent(agent.conversation_agent_name);
      }
    } else {
      setSelectedAgent('all');
      setConversationGroups([]);
      setSelectedConversation(null);
    }
  }, [selectedPlatformAgent, allPlatformAgents]);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        // Cargar agentes desde MySQL y aplicar permisos
        const res = await fetch('/api/agents');
        const data = await res.json();
        let list: AgentDB[] = data.ok ? data.agents : [];
        const permissions = getPermissions();
        const userId = getUserId();
        if (permissions && userId && permissions.type !== 'admin' && !permissions.conversaciones?.viewAll) {
          list = list.filter(a => a.client_id === parseInt(userId));
        }
        setAllPlatformAgents(list);
      } catch (e) {
        console.error('Error cargando agentes:', e);
      } finally {
        setAgentsInitialized(true);
      }
    };
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent !== 'all') {
      loadConversations();
    }
  }, [selectedAgent, dateFrom, dateTo, searchQuery]);

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
      console.log('Cargando conversaciones del agente:', selectedAgent, 'búsqueda:', searchQuery);
      
      const allDocuments: Document[] = [];
      
      // Si hay búsqueda, usar búsqueda de Meilisearch
      let searchFailed = false;
      if (searchQuery && searchQuery.trim()) {
        try {
          // Construir filtros para Meilisearch (formato string)
          const filters: string[] = [];
          filters.push(`agent = "${selectedAgent}"`);
          filters.push(`type = "agent"`);
          
          // Meilisearch necesita fechas como strings ISO, no timestamps
          if (dateFrom && dateTo) {
            const fromDateISO = new Date(dateFrom + 'T00:00:00Z').toISOString();
            const toDateISO = new Date(dateTo + 'T23:59:59Z').toISOString();
            filters.push(`datetime >= "${fromDateISO}"`);
            filters.push(`datetime <= "${toDateISO}"`);
          }
          
          // Realizar búsqueda con filtros usando searchDocuments
          const searchResults = await meilisearchAPI.searchDocuments(
            INDEX_UID,
            searchQuery,
            1000,
            0,
            { filter: filters.join(' AND ') }
          );
          
          allDocuments.push(...(searchResults.hits as Document[]));
          console.log(`Búsqueda encontrada: ${allDocuments.length} documentos`);
        } catch (err: any) {
          console.error('Error en búsqueda de Meilisearch:', err);
          console.error('Detalles del error:', err.response?.data);
          searchFailed = true;
          // Continuar con carga normal si falla la búsqueda
        }
      }
      
      // Si no hay búsqueda o si la búsqueda falló, cargar todos los documentos normalmente
      if (!searchQuery || !searchQuery.trim() || searchFailed) {
        let currentOffset = 0;
        const batchLimit = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const data = await meilisearchAPI.getDocuments(INDEX_UID, batchLimit, currentOffset);
          
          // Filtrar por agente, por type === 'agent' y por rango de fechas
          const filtered = data.results.filter((doc: Document) => {
            const isAgent = doc.agent === selectedAgent;
            const isTypeAgent = doc.type === 'agent';
            
            // Filtro de fechas
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
      
      // Filtrar conversaciones que contengan el texto buscado (si hay búsqueda)
      let filteredConversations = conversationGroupsArray;
      if (searchQuery && searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        filteredConversations = conversationGroupsArray.filter(group => {
          // Buscar en todos los mensajes de la conversación
          return group.messages.some(message => {
            const humanMsg = message['message-Human'] || '';
            const aiMsg = message['message-AI'] || '';
            return humanMsg.toLowerCase().includes(queryLower) || 
                   aiMsg.toLowerCase().includes(queryLower);
          });
        });
        console.log(`Conversaciones filtradas por búsqueda: ${filteredConversations.length} de ${conversationGroupsArray.length}`);
      }
      
      console.log(`Total de conversaciones agrupadas: ${filteredConversations.length}`);
      setConversationGroups(filteredConversations);
      setCurrentAgent(selectedAgent);
      
      // Auto-seleccionar la primera conversación (si hay resultados filtrados)
      if (filteredConversations.length > 0) {
        // Si la conversación seleccionada actual está en los filtrados, mantenerla
        const currentStillExists = filteredConversations.find(g => g.user_id === selectedConversation?.user_id);
        if (currentStillExists) {
          setSelectedConversation(currentStillExists);
        } else {
          setSelectedConversation(filteredConversations[0]);
        }
      } else {
        setSelectedConversation(null);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
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

  const highlightSearchText = (text: string, searchQuery: string, isGreenBackground = false) => {
    if (!searchQuery || !text) return text;
    
    // Escapar caracteres especiales de regex en la búsqueda
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark 
          key={index} 
          className={isGreenBackground 
            ? "bg-yellow-400 text-gray-900 font-semibold px-1 rounded" 
            : "bg-yellow-300 text-gray-900 font-medium px-1 rounded"
          }
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Conversaciones</h1>
        
        {/* Selector de Agente de la Plataforma */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Agente de la Plataforma
          </label>
          {!agentsInitialized ? (
            <div className="text-blue-600 text-sm flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              Cargando agentes de la plataforma...
            </div>
          ) : (
            <>
              <select
                value={selectedPlatformAgent}
                onChange={(e) => setSelectedPlatformAgent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos los agentes</option>
                {allPlatformAgents.map((agent) => (
                  <option key={agent.id} value={agent.id.toString()}>
                    {agent.name} {agent.conversation_agent_name ? `(${agent.conversation_agent_name})` : '(sin identificar)'}
                  </option>
                ))}
              </select>
              {selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
                <div className="mt-3">
                  {(() => {
                    const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
                    return agent ? (
                      <div className="flex items-center gap-3">
                        {agent.photo && (
                          <img
                            src={agent.photo}
                            alt={agent.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{agent.name}</p>
                          {agent.description && (
                            <p className="text-sm text-gray-500">{agent.description}</p>
                          )}
                          {agent.conversation_agent_name && (
                            <p className="text-xs text-gray-400">ID: {agent.conversation_agent_name}</p>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </>
          )}
        </div>

        {/* Búsqueda y Filtro de Fechas - Solo visible cuando hay agente seleccionado */}
        {selectedAgent !== 'all' && selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
          <>
            {/* Campo de Búsqueda */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por Palabras Clave
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en conversaciones..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>

            {/* Filtro de Fechas */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Filtrar por Rango de Fechas
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {(() => {
                  const today = new Date();
                  const todayStr = today.toISOString().split('T')[0];
                  const isToday = dateFrom === todayStr && dateTo === todayStr;
                  
                  const weekAgo = new Date(today);
                  weekAgo.setDate(today.getDate() - 7);
                  const weekAgoStr = weekAgo.toISOString().split('T')[0];
                  const isLast7Days = dateFrom === weekAgoStr && dateTo === todayStr;
                  
                  const monthAgo = new Date(today);
                  monthAgo.setMonth(today.getMonth() - 1);
                  const monthAgoStr = monthAgo.toISOString().split('T')[0];
                  const isLast30Days = dateFrom === monthAgoStr && dateTo === todayStr;
                  
                  const yearAgo = new Date(today);
                  yearAgo.setFullYear(today.getFullYear() - 1);
                  const yearAgoStr = yearAgo.toISOString().split('T')[0];
                  const isLastYear = dateFrom === yearAgoStr && dateTo === todayStr;
                  
                  return (
                    <>
                      <button
                        onClick={() => {
                          setDateFrom(todayStr);
                          setDateTo(todayStr);
                        }}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          isToday
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        HOY
                      </button>
                      <button
                        onClick={() => {
                          setDateFrom(weekAgoStr);
                          setDateTo(todayStr);
                        }}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          isLast7Days
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Últimos 7 días
                      </button>
                      <button
                        onClick={() => {
                          setDateFrom(monthAgoStr);
                          setDateTo(todayStr);
                        }}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          isLast30Days
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Últimos 30 días
                      </button>
                      <button
                        onClick={() => {
                          setDateFrom(yearAgoStr);
                          setDateTo(todayStr);
                        }}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          isLastYear
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Último año
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        {selectedAgent === 'all' || !selectedPlatformAgent || selectedPlatformAgent === 'all' ? (
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
                      className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation?.user_id === group.user_id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar circular como WhatsApp */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                          {group.phone_number_id ? (
                            <span className="text-lg font-semibold text-gray-600">
                              {group.phone_number_id.substring(group.phone_number_id.length - 1)}
                            </span>
                          ) : (
                            <span className="text-lg font-semibold text-gray-600">
                              {group.user_id.substring(group.user_id.length - 1)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-semibold text-gray-900 truncate">{group.user_id}</span>
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{formatTime(group.lastDate)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1 truncate">{group.phone_number_id}</p>
                          <p className="text-sm text-gray-600 truncate">
                            {searchQuery ? highlightSearchText(group.lastMessage, searchQuery) : group.lastMessage}...
                          </p>
                        </div>
                      </div>
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
                                <p className="text-sm">
                                  {searchQuery 
                                    ? highlightSearchText(message['message-Human'], searchQuery, true)
                                    : message['message-Human']
                                  }
                                </p>
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
                                <p className="text-sm text-gray-800">
                                  {searchQuery 
                                    ? highlightSearchText(message['message-AI'], searchQuery)
                                    : message['message-AI']
                                  }
                                </p>
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

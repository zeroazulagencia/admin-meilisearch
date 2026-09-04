'use client';

import { useState, useEffect, useMemo } from 'react';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import { getPermissions, getUserId } from '@/utils/permissions';
import ProtectedLayout from '@/components/ProtectedLayout';
import AgentSelector from '@/components/ui/AgentSelector';
import NoticeModal from '@/components/ui/NoticeModal';
import KpiDashboard from '@/app/omnicanalidad/components/KpiDashboard';
import DashboardConversaciones from '@/components/dashboard/DashboardConversaciones';
import { classifyQueryType, classifyConversation } from '@/app/omnicanalidad/utils/query-classifier';

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
  status?: string;
  conversation_agent_name?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
}

interface HumanModeStatus {
  isHumanMode: boolean;
  takenBy?: number;
  takenAt?: string;
}

interface MessageFileInfo {
  name: string;
  mime: string;
  kind: 'image' | 'file';
}

function getMessageFile(message: Document): MessageFileInfo | null {
  const mime = String(message.file_mime || message.document_mime || message.image_mime || '').trim();
  const name = String(
    message.file_name ||
    message.document_filename ||
    message.document_name ||
    message.filename ||
    message.image_name ||
    ''
  ).trim();
  const human = String(message['message-Human'] || message['message'] || '');
  const archivoMatch = human.match(/\[Archivo\]\s*(.+)$/im);
  const looksPdf = /pdf/i.test(mime) || /\.pdf$/i.test(name) || /\.pdf$/i.test(archivoMatch?.[1] || '');
  const looksImage = /^image\//i.test(mime);
  const base64 = String(message.image_base64 || '').trim();
  const base64IsImage = base64.startsWith('data:image/') || (looksImage && base64.length > 50 && !looksPdf);

  if (looksPdf || message.file_name || message.document_filename || message.filename || archivoMatch) {
    return {
      name: name || archivoMatch?.[1]?.trim() || 'documento.pdf',
      mime: mime || 'application/pdf',
      kind: 'file',
    };
  }

  if (base64IsImage || (looksImage && name)) {
    return { name: name || 'imagen', mime: mime || 'image/jpeg', kind: 'image' };
  }

  if (name && !looksImage) {
    return { name, mime: mime || 'application/octet-stream', kind: 'file' };
  }

  return null;
}

function getHumanTextWithoutFileTag(message: Document, file: MessageFileInfo | null): string {
  let text = String(message['message-Human'] || (message.type === 'user' ? message['message'] : '') || '').trim();
  if (file?.kind === 'file' && file.name) {
    const escaped = file.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`\\[Archivo\\]\\s*${escaped}\\s*$`, 'i'), '').trim();
    text = text.replace(/\[Archivo\]\s*.+$/im, '').trim();
  }
  return text;
}

function getMessagePreview(message: Document): string {
  const file = getMessageFile(message);
  const human = getHumanTextWithoutFileTag(message, file);
  if (human) return human.substring(0, 50);
  if (file?.kind === 'file') return `📎 ${file.name}`.substring(0, 50);
  if (file?.kind === 'image' || String(message.image_base64 || '').trim()) return '📷 Imagen';
  const ai = String(message['message-AI'] || '').trim();
  if (ai) return ai.substring(0, 50);
  const generic = String(message['message'] || '').trim();
  return generic.substring(0, 50);
}

function FileAttachmentChip({ file, inverted = false }: { file: MessageFileInfo; inverted?: boolean }) {
  const isPdf = /pdf/i.test(file.mime) || /\.pdf$/i.test(file.name);
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 mb-1 ${
        inverted ? 'bg-white/20' : 'bg-gray-100'
      }`}
    >
      <svg className={`w-8 h-8 flex-shrink-0 ${inverted ? 'text-white' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v1.5H8V13zm0 3h8v1.5H8V16zm0-6h5v1.5H8V10z" />
      </svg>
      <div className="min-w-0">
        <p className={`text-sm font-medium truncate ${inverted ? 'text-white' : 'text-gray-900'}`}>{file.name}</p>
        <p className={`text-[10px] uppercase ${inverted ? 'text-white/80' : 'text-gray-500'}`}>
          {isPdf ? 'PDF' : (file.mime.split('/')[1] || 'archivo')}
        </p>
      </div>
    </div>
  );
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
  const [allDocumentsForCSV, setAllDocumentsForCSV] = useState<Document[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Calcular fechas por defecto: hoy (rango de un solo día)
  const getDefaultDates = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    
    const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return { firstDayStr: todayStr, todayStr };
  };

  const defaultDates = getDefaultDates();
  const [dateFrom, setDateFrom] = useState<string>(defaultDates.firstDayStr);
  const [dateTo, setDateTo] = useState<string>(defaultDates.todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const INDEX_UID = 'bd_conversations_dworkers';

  // Asegurar que las fechas se actualicen si cambian (por si acaso)
  useEffect(() => {
    if (!dateFrom || !dateTo) {
      const dates = getDefaultDates();
      setDateFrom(dates.firstDayStr);
      setDateTo(dates.todayStr);
    }
  }, []);

  useEffect(() => {
    if (selectedPlatformAgent !== 'all' && selectedPlatformAgent) {
      // Obtener el conversation_agent_name del agente seleccionado
      const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
      if (agent?.conversation_agent_name) {
        setSelectedAgent(agent.conversation_agent_name);
      }
      // Resetear rango de fecha a HOY al elegir un agente
      const { todayStr } = getDefaultDates();
      setDateFrom(todayStr);
      setDateTo(todayStr);
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
        // Filtrar solo agentes activos y que tienen conversation_agent_name asociado
        list = list.filter(a => a.status === 'active' && a.conversation_agent_name && a.conversation_agent_name.trim() !== '');
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
      // NO cargar automáticamente cuando cambia searchQuery
      // Solo cargar cuando cambia selectedAgent, dateFrom o dateTo
      // La búsqueda se activará manualmente con el botón "Buscar"
      loadConversations();
    }
  }, [selectedAgent, dateFrom, dateTo]);

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
          // Nota: type no es buscable en Meilisearch, se filtra manualmente después
          const filters: string[] = [];
          filters.push(`agent = "${selectedAgent}"`);
          
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
          
          // Filtrar manualmente por type (agent o user) y rango de fechas
          // porque type no es buscable en Meilisearch
          const filteredResults = (searchResults.hits as Document[]).filter((doc: Document) => {
            const isTypeAgent = doc.type === 'agent' || doc.type === 'user';
            
            // Filtro de fechas
            let isInDateRange = true;
            if (dateFrom && doc.datetime) {
              const docDate = new Date(doc.datetime);
              const fromDate = new Date(dateFrom + 'T00:00:00');
              const toDate = new Date(dateTo + 'T23:59:59');
              isInDateRange = docDate >= fromDate && docDate <= toDate;
            }
            
            return isTypeAgent && isInDateRange;
          });
          
          allDocuments.push(...filteredResults);
          console.log(`Búsqueda encontrada: ${filteredResults.length} documentos (filtrados de ${searchResults.hits.length})`);
        } catch (err: any) {
          // Si la búsqueda con filtros falla, continuar silenciosamente con carga normal
          // Esto es esperado cuando Meilisearch no puede procesar ciertos filtros
          // La aplicación funciona correctamente usando el fallback
          searchFailed = true;
          // Continuar con carga normal si falla la búsqueda
        }
      }
      
      // Si no hay búsqueda o si la búsqueda falló, usar search con filtros (más rápido que getDocuments)
      if (!searchQuery || !searchQuery.trim() || searchFailed) {
        // Construir filtros igual que en la búsqueda con texto
        const filters: string[] = [];
        if (selectedAgent) {
          filters.push(`agent = "${selectedAgent}"`);
        }
        if (dateFrom && dateTo) {
          const fromDateISO = new Date(dateFrom + 'T00:00:00Z').toISOString();
          const toDateISO = new Date(dateTo + 'T23:59:59Z').toISOString();
          filters.push(`datetime >= "${fromDateISO}"`);
          filters.push(`datetime <= "${toDateISO}"`);
        }
        
        const filterStr = filters.join(' AND ');
        
        // Paginar con searchDocuments (respeta maxTotalHits de Meilisearch)
        let searchHasMore = true;
        let searchOffset = 0;
        const searchLimit = 1000;
        
        while (searchHasMore) {
          const searchResults = await meilisearchAPI.searchDocuments(
            INDEX_UID,
            '*', // wildcard search para traer todos los docs
            searchLimit,
            searchOffset,
            { filter: filterStr }
          );
          
          // Filtrar manualmente por type (agent o user) - no filterable en Meilisearch
          const filtered = (searchResults.hits as Document[]).filter((doc: Document) => {
            return doc.type === 'agent' || doc.type === 'user';
          });
          
          allDocuments.push(...filtered);
          
          if (searchResults.hits.length < searchLimit) {
            searchHasMore = false;
          } else {
            searchOffset += searchLimit;
          }
        }
      }
      
      console.log(`Total de documentos cargados: ${allDocuments.length}`);
      console.log('Ejemplos de documentos:', allDocuments.slice(0, 3));
      
      // Guardar documentos para descarga CSV
      setAllDocumentsForCSV(allDocuments);
      
      // Agrupar por phone_id/session_id (prioridad) o user_id (respaldo)
      // IMPORTANTE: Para WhatsApp, múltiples usuarios pueden compartir el mismo phone_id
      // Por eso combinamos phone_id + user_id cuando ambos están presentes
      const groups = new Map<string, Document[]>();
      
      allDocuments.forEach(doc => {
        // Obtener phone_id y user_id
        const phoneId = doc.phone_id || doc.phone_number_id;
        
        // Obtener user_id de todas las variaciones posibles
        let userId: string | null = null;
        const possibleUserFields = [
          doc.user_id,
          doc.iduser,
          doc.userid,
          doc.i_user,
          doc.id_user,
          doc.userId,
          doc.userID,
          doc.IDuser,
          doc.ID_user
        ];
        
        for (const userIdValue of possibleUserFields) {
          if (userIdValue && userIdValue !== 'unknown' && String(userIdValue).trim().length > 0) {
            userId = String(userIdValue).trim();
            break; // Usar el primer campo válido encontrado
          }
        }
        
        let groupKey: string | null = null;
        
        // Prioridad 1: Si hay phone_id Y user_id, combinar ambos (caso WhatsApp con múltiples usuarios)
        if (phoneId && phoneId !== 'unknown' && String(phoneId).trim().length > 0 && 
            userId && userId !== 'unknown' && userId.length > 0) {
          groupKey = `phone_${String(phoneId).trim()}_user_${userId}`;
        } 
        // Prioridad 2: Si solo hay phone_id sin user_id válido, usar solo phone_id
        else if (phoneId && phoneId !== 'unknown' && String(phoneId).trim().length > 0) {
          groupKey = `phone_${String(phoneId).trim()}`;
        } 
        // Prioridad 3: session_id
        else {
          const sessionId = doc.session_id;
          if (sessionId && sessionId !== 'unknown' && String(sessionId).trim().length > 0) {
            groupKey = `session_${String(sessionId).trim()}`;
          } 
          // Prioridad 4: Solo user_id (caso conversaciones no-WhatsApp)
          else if (userId && userId !== 'unknown' && userId.length > 0) {
            groupKey = `user_${userId}`;
          }
        }
        
        // Solo agrupar si tiene una clave válida
        if (groupKey) {
          if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
          }
          groups.get(groupKey)!.push(doc);
        }
      });
      
      console.log(`Total de conversaciones agrupadas: ${groups.size}`);
      
      // Convertir a array y ordenar
      const conversationGroupsArray: ConversationGroup[] = Array.from(groups.entries()).map(([groupKey, messages]) => {
        // Ordenar mensajes por datetime
        const sortedMessages = messages.sort((a, b) => {
          const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
          const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
          return dateA - dateB;
        });
        
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        
        // Extraer phone_id, session_id y user_id del grupo
        const rawPhoneId = lastMessage.phone_number_id || lastMessage.phone_id || '';
        const phoneId = rawPhoneId ? String(rawPhoneId).trim() : '';
        const sessionId = lastMessage.session_id ? String(lastMessage.session_id).trim() : '';
        
        // Determinar user_id de todas las variaciones posibles
        let userId = '';
        const possibleUserFields = [
          lastMessage.user_id,
          lastMessage.iduser,
          lastMessage.userid,
          lastMessage.i_user,
          lastMessage.id_user,
          lastMessage.userId,
          lastMessage.userID,
          lastMessage.IDuser,
          lastMessage.ID_user
        ];
        
        for (const userIdValue of possibleUserFields) {
          if (userIdValue && userIdValue !== 'unknown' && String(userIdValue).trim().length > 0) {
            userId = String(userIdValue).trim();
            break;
          }
        }
        
        // Si no hay userId del último mensaje, buscar en todos los mensajes del grupo
        if (!userId) {
          for (const msg of sortedMessages) {
            const possibleUserFields = [
              msg.user_id,
              msg.iduser,
              msg.userid,
              msg.i_user,
              msg.id_user,
              msg.userId,
              msg.userID,
              msg.IDuser,
              msg.ID_user
            ];
            
            for (const userIdValue of possibleUserFields) {
              if (userIdValue && userIdValue !== 'unknown' && String(userIdValue).trim().length > 0) {
                userId = String(userIdValue).trim();
                break;
              }
            }
            if (userId) break;
          }
        }
        
        // Si aún no hay userId, extraerlo de la clave del grupo (sin el prefijo)
        if (!userId && groupKey) {
          const parts = groupKey.split('_');
          if (parts.length > 1) {
            userId = parts.slice(1).join('_'); // Tomar todo después del prefijo
          } else {
            userId = groupKey;
          }
        }
        
        // Si aún no hay userId, usar 'unknown' como último recurso
        if (!userId) {
          userId = 'unknown';
        }
        
        // Debug: mostrar información de extracción
        console.log('[MAPEO] Grupo:', {
          groupKey,
          userId,
          phoneId,
          sessionId,
          lastMessageKeys: Object.keys(lastMessage)
        });
        
        const lastMessageText = getMessagePreview(lastMessage);
        
        // Debug: mostrar información final del grupo
        console.log('[MAPEO] Grupo final:', {
          groupKey,
          userId,
          phoneId,
          sessionId,
          phone_number_id: phoneId || sessionId || ''
        });
        
        return {
          user_id: userId,
          phone_number_id: phoneId || sessionId || '',
          lastMessage: lastMessageText,
          lastDate: lastMessage.datetime || '',
          messages: sortedMessages
        };
      }).filter(group => {
        // Filtrar: mostrar si tiene user_id válido (phone_id es opcional)
        const userIdRaw = group.user_id;
        
        // Debug: mostrar información del grupo
        console.log('[FILTRO] Grupo:', {
          user_id: userIdRaw,
          phone_number_id: group.phone_number_id,
          hasUserId: !!userIdRaw,
          userIdType: typeof userIdRaw,
          userIdLength: userIdRaw ? String(userIdRaw).length : 0
        });
        
        // Mostrar si tiene user_id válido (no null, no undefined, no vacío, no "unknown")
        if (userIdRaw && userIdRaw !== null && userIdRaw !== undefined) {
          const userIdStr = String(userIdRaw).trim();
          if (userIdStr.length > 0 && userIdStr.toLowerCase() !== 'unknown') {
            console.log('[FILTRO] Aceptado por user_id:', userIdStr);
            return true;
          } else {
            console.log('[FILTRO] Rechazado - user_id inválido:', userIdStr);
          }
        } else {
          console.log('[FILTRO] Rechazado - user_id es null/undefined:', userIdRaw);
        }
        
        return false;
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
          // Buscar en todos los mensajes de la conversación + campos de identificación
          return group.messages.some(message => {
            const humanMsg = message['message-Human'] || '';
            const aiMsg = message['message-AI'] || '';
            const genericMsg = message['message'] || '';
            const fileName = String(
              message.file_name || message.document_filename || message.filename || message.image_name || ''
            );
            // También buscar en campos de identificación (user_id, phone_id, etc.)
            const userId = String(
              message.user_id || message.iduser || message.userid || message.i_user || message.id_user || ''
            );
            const phoneId = String(
              message.phone_id || message.phone_number_id || ''
            );
            return humanMsg.toLowerCase().includes(queryLower) || 
                   aiMsg.toLowerCase().includes(queryLower) ||
                   genericMsg.toLowerCase().includes(queryLower) ||
                   fileName.toLowerCase().includes(queryLower) ||
                   userId.toLowerCase().includes(queryLower) ||
                   phoneId.toLowerCase().includes(queryLower);
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

  const downloadCSV = () => {
    if (allDocumentsForCSV.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Información',
        message: 'No hay conversaciones para descargar',
        type: 'info',
      });
      return;
    }

    // Crear CSV con encabezados
    const headers = ['user_id', 'phone_number_id', 'phone_id', 'session_id', 'agent', 'type', 'datetime', 'message-Human', 'message-AI', 'message', 'file_name', 'file_mime', 'conversation_id'];
    const csvRows = [headers.join(',')];

    // Agregar filas de datos
    allDocumentsForCSV.forEach(doc => {
      const row = [
        doc.user_id || doc.iduser || doc.userid || '',
        doc.phone_number_id || '',
        doc.phone_id || '',
        doc.session_id || '',
        doc.agent || '',
        doc.type || '',
        doc.datetime || '',
        ((doc['message-Human'] as string) || '').replace(/"/g, '""'), // Escapar comillas
        ((doc['message-AI'] as string) || '').replace(/"/g, '""'), // Escapar comillas
        (doc.message || doc.text || '').replace(/"/g, '""'), // Escapar comillas
        String(doc.file_name || doc.document_filename || doc.filename || doc.image_name || '').replace(/"/g, '""'),
        String(doc.file_mime || doc.document_mime || doc.image_mime || '').replace(/"/g, '""'),
        doc.conversation_id || ''
      ];
      // Envolver cada campo en comillas para manejar comas y saltos de línea
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });

    // Crear blob y descargar
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `conversaciones_${selectedAgent}_${dateFrom}_${dateTo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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



  const permissions = getPermissions();
  const isAdmin = permissions?.type === 'admin';

  // Clasificador de tipos de consulta: cuenta mensajes y conversaciones por tipo
  const mensajesPorTipo = useMemo(() => {
    const counts: Record<string, { mensajes: number; conversaciones: number }> = {};
    const convMessages = new Map<string, { messages: { text: string; datetime: string }[] }>();

    // 1. Agrupar todos los mensajes por conversación (phone_id/session_id)
    for (const doc of allDocumentsForCSV) {
      const msg = (doc as any)['message-Human'] || (doc as any)['message'] || '';
      if (!msg.trim()) continue;
      const phoneId = doc.phone_id || doc.phone_number_id || '';
      const key = phoneId ? `phone_${phoneId}` : `session_${doc.session_id || ''}`;
      if (!convMessages.has(key)) {
        convMessages.set(key, { messages: [] });
      }
      convMessages.get(key)!.messages.push({
        text: msg,
        datetime: (doc as any).datetime || '',
      });
    }

    // 2. Por cada conversación, ordenar mensajes y clasificar probando hasta 3
    convMessages.forEach((data) => {
      // Ordenar cronológicamente
      data.messages.sort((a, b) => a.datetime.localeCompare(b.datetime));
      const texts = data.messages.map(m => m.text);

      // Clasificar la conversación (prueba msg 1, 2 y 3 si los anteriores son General)
      const convType = classifyConversation(texts);

      if (!counts[convType]) counts[convType] = { mensajes: 0, conversaciones: 0 };
      counts[convType].conversaciones++;

      // Cada mensaje individual cuenta hacia el tipo que le corresponda
      for (const text of texts) {
        const msgType = classifyQueryType(text);
        if (!counts[msgType]) counts[msgType] = { mensajes: 0, conversaciones: 0 };
        counts[msgType].mensajes++;
      }
    });

    return counts;
  }, [allDocumentsForCSV, dateFrom, dateTo]);

  return (
    <ProtectedLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conversaciones</h1>
        <div className="flex gap-2">
          {selectedAgent !== 'all' && (
            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              title="Descargar conversaciones filtradas en CSV"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar CSV
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              title="Ver instrucciones de inserción"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Selector de Agente de la Plataforma */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <AgentSelector
          label="Seleccionar Agente de la Plataforma"
          agents={allPlatformAgents}
          selectedAgent={selectedPlatformAgent}
          onChange={(agent) => {
            if (typeof agent === 'string') {
              setSelectedPlatformAgent(agent);
            } else if (agent === null) {
              setSelectedPlatformAgent('');
            } else {
              setSelectedPlatformAgent(agent.id.toString());
            }
          }}
          placeholder="Seleccionar agente..."
          loading={!agentsInitialized}
          className="w-full"
        />
        {selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
          <div className="mt-3">
            {(() => {
              const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
              return agent ? (
                <div className="flex items-center gap-3">
                  {agent.photo ? (
                    <img
                      src={agent.photo}
                      alt={agent.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-[#5DE1E5] to-[#4BC5C9] flex items-center justify-center text-white text-lg font-bold border-2 border-gray-200 ${agent.photo ? 'hidden' : ''}`}>
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
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
      </div>

        {/* Búsqueda y Filtro de Fechas - Solo visible cuando hay agente seleccionado */}
        {selectedAgent !== 'all' && selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
          <>
            {/* Campo de Búsqueda */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por Palabras Clave
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      loadConversations();
                    }
                  }}
                  placeholder="Buscar en conversaciones..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                />
                <button
                  onClick={() => loadConversations()}
                  className="px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:opacity-90 transition-all font-medium"
                >
                  Buscar
                </button>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      loadConversations();
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Filtro de Fechas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
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

        {/* Info: fecha desde que hay datos */}
        {selectedAgent !== 'all' && selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
          <div className="text-xs text-gray-400 mb-4 px-1 flex gap-3">
            <span>📅 Datos desde: <strong>28 ago 2025</strong></span>
            <span>🧾 Primera factura registrada: <strong>01 mar 2026</strong></span>
          </div>
        )}

        {/* KPI Dashboard - Solo para agente Amistoso */}
        {selectedAgent === 'amistoso' && (
            <div className="mb-6">
              <KpiDashboard documents={allDocumentsForCSV} agentName="amistoso" mensajesPorTipo={mensajesPorTipo} dateFrom={dateFrom} dateTo={dateTo} />
            </div>
        )}

        {/* Dashboard Conversaciones - Solo para agente Lucas (Autolarte) */}
        {selectedAgent === 'Lucas' && selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
          <div className="mb-6">
            {(() => {
              const agent = allPlatformAgents.find(p => p.id === parseInt(selectedPlatformAgent));
              const displayName = agent?.name || 'Lucas';
              return (
                <DashboardConversaciones
                  documents={allDocumentsForCSV}
                  mensajesPorTipo={mensajesPorTipo}
                  agentName="Lucas"
                  agentDisplayName={displayName}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                />
              );
            })()}
          </div>
        )}

        {selectedAgent === 'all' || !selectedPlatformAgent || selectedPlatformAgent === 'all' ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Selecciona un agente para ver sus conversaciones</p>
          </div>
        ) : loadingConversations ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin h-8 w-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
              <p className="mt-2 text-gray-600">Cargando conversaciones...</p>
            </div>
          </div>
        ) : conversationGroups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay conversaciones disponibles</p>
          </div>
        ) : (
          <div 
            className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all ${
              isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
            }`}
            style={isFullscreen ? { height: '100vh' } : { height: 'calc(100vh - 250px)' }}
          >
            <div className="flex h-full">
              {/* Panel Izquierdo - Lista de Conversaciones */}
              <div className={`${isFullscreen ? 'hidden' : 'w-1/3'} border-r border-gray-200 flex flex-col transition-all`}>
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
                          {group.phone_number_id && group.phone_number_id.trim() !== '' && (
                            <p className="text-xs text-gray-500 mb-1 truncate">{group.phone_number_id}</p>
                          )}
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
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{selectedConversation.user_id}</h3>
                          {selectedConversation.phone_number_id && selectedConversation.phone_number_id.trim() !== '' && (
                            <p className="text-xs text-gray-500">{selectedConversation.phone_number_id}</p>
                          )}
                          {selectedConversation.lastDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(selectedConversation.lastDate)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              loadConversations();
                            }}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Recargar conversación"
                            disabled={loadingConversations}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                          >
                            {isFullscreen ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div 
                      id="chat-messages-container"
                      className="flex-1 overflow-y-auto p-4 space-y-3"
                      style={{ scrollBehavior: 'smooth' }}
                    >
                      {selectedConversation.messages.map((message, index) => {
                        const file = getMessageFile(message);
                        const hasFile = file?.kind === 'file';
                        const humanText = getHumanTextWithoutFileTag(message, file);
                        const hasHuman = humanText !== '';
                        const hasAI = message['message-AI'] && message['message-AI'].trim() !== '';
                        const hasMessage = message['message'] && message['message'].trim() !== '';
                        const imageSrc = String(message['image_base64'] || '').trim();
                        const hasImage = Boolean(imageSrc) && file?.kind !== 'file' && (
                          imageSrc.startsWith('data:image/') || imageSrc.startsWith('http') || (file?.kind === 'image')
                        );
                        
                        // Si no tiene texto, imagen ni archivo, no mostrar nada
                        if (!hasHuman && !hasAI && !hasMessage && !hasImage && !hasFile) return null;
                        
                        const showHumanBubble = hasHuman || hasFile || (hasMessage && message.type === 'user') || (hasImage && !hasAI && message.type === 'user');
                        
                        return (
                          <div key={index} className="flex flex-col gap-2">
                            {/* Mensaje Human - texto, PDF/archivo o imagen enviada por el usuario */}
                            {showHumanBubble && (
                              <div className="flex justify-end mb-2">
                                <div className="max-w-[70%] flex flex-col items-end">
                                  {hasHuman && (
                                    <span className="text-[10px] font-medium text-gray-400 mb-1 bg-gray-100 px-2 py-0.5 rounded-full">
                                      {classifyQueryType(humanText)}
                                    </span>
                                  )}
                                  <div className="bg-green-500 text-white rounded-2xl px-3 py-2 shadow-sm" style={{ 
                                  borderRadius: '18px 18px 4px 18px' // Esquina redondeada estilo WhatsApp
                                }}>
                                  {hasFile && file && <FileAttachmentChip file={file} inverted />}
                                  {/* Mostrar imagen si existe (no PDFs) */}
                                  {hasImage && (
                                    <div className="mb-2 rounded-lg overflow-hidden">
                                      <img 
                                        src={imageSrc} 
                                        alt="Imagen del mensaje" 
                                        className="max-w-full h-auto rounded-lg"
                                        style={{ maxHeight: '300px' }}
                                      />
                                    </div>
                                  )}
                                  {humanText && (
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {searchQuery 
                                      ? highlightSearchText(humanText, searchQuery, true)
                                      : humanText
                                    }
                                  </p>
                                  )}
                                  <div className="flex items-center justify-end gap-1 mt-1">
                                    <p className="text-xs text-green-100">
                                      {formatTime(message.datetime)}
                                    </p>
                                    {/* Mostrar doble check azul para mensajes enviados (estilo WhatsApp) */}
                                    <svg className="w-4 h-4 text-blue-200 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              )}
                              
                              {/* Mensaje AI - mostrar si existe message-AI o message con type agent */}
                            {(hasAI || (hasMessage && message.type === 'agent')) && (
                              <div className="flex justify-start mb-2">
                                <div className="max-w-[70%] bg-white rounded-2xl px-3 py-2 shadow-sm" style={{ 
                                  borderRadius: '18px 18px 18px 4px' // Esquina redondeada estilo WhatsApp
                                }}>
                                  {hasFile && file && !showHumanBubble && <FileAttachmentChip file={file} />}
                                  {/* Mostrar imagen si existe */}
                                  {hasImage && !showHumanBubble && (
                                    <div className="mb-2 rounded-lg overflow-hidden">
                                      <img 
                                        src={imageSrc} 
                                        alt="Imagen del mensaje" 
                                        className="max-w-full h-auto rounded-lg"
                                        style={{ maxHeight: '300px' }}
                                      />
                                    </div>
                                  )}
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                                    {searchQuery 
                                      ? highlightSearchText(
                                          message['message-AI'] || message['message'] || '', 
                                          searchQuery
                                        )
                                      : (message['message-AI'] || message['message'] || '')
                                    }
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatTime(message.datetime)}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Si solo hay imagen sin mensaje de texto */}
                            {hasImage && !showHumanBubble && !hasAI && !hasMessage && (
                              <div className="flex justify-end">
                                <div className="max-w-[70%] bg-green-500 rounded-2xl px-3 py-2 shadow-sm" style={{ borderRadius: '18px 18px 4px 18px' }}>
                                  <div className="rounded-lg overflow-hidden">
                                    <img 
                                      src={imageSrc} 
                                      alt="Imagen del mensaje" 
                                      className="max-w-full h-auto rounded-lg"
                                      style={{ maxHeight: '300px' }}
                                    />
                                  </div>
                                  <p className="text-xs text-green-100 mt-1 text-right">
                                    {formatTime(message.datetime)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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

      {/* Modal de Instrucciones de Código */}
      <NoticeModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header del Modal */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Insertar Conversación en Meilisearch</h2>
                    <p className="text-sm text-gray-500">Instrucciones usando curl</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Contenido del Modal */}
            <div className="p-6 flex-1 overflow-auto bg-gray-50">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="space-y-6">
                  {/* Información del Endpoint */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Endpoint</h3>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <div className="text-green-400">POST</div>
                      <div className="mt-1">https://server-search.zeroazul.com/indexes/{INDEX_UID}/documents</div>
                    </div>
                  </div>

                  {/* Ejemplo de curl */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Ejemplo con curl</h3>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{`curl -X POST 'https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/documents' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_MEILISEARCH_API_KEY' \\
  -d '{
    "id": "conv-001",
    "type": "agent",
    "datetime": "2024-01-15T10:30:00Z",
    "agent": "nombre-del-agente",
    "user_id": "user-123",
    "phone_id": "+573001234567",
    "message-Human": "Hola, ¿cómo estás?",
    "message-AI": "Hola, estoy bien, ¿en qué puedo ayudarte?"
  }'`}</pre>
                    </div>
                  </div>

                  {/* Estructura del Documento */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Estructura del Documento</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="space-y-2 text-sm font-mono text-gray-700">
                        <div><span className="text-blue-600">id</span>: <span className="text-gray-600">string (requerido) - Identificador único del mensaje</span></div>
                        <div><span className="text-blue-600">type</span>: <span className="text-gray-600">string (requerido) - Debe ser &quot;agent&quot;</span></div>
                        <div><span className="text-blue-600">datetime</span>: <span className="text-gray-600">string ISO 8601 (requerido) - Fecha y hora del mensaje</span></div>
                        <div><span className="text-blue-600">agent</span>: <span className="text-gray-600">string (requerido) - Nombre del agente (debe coincidir con conversation_agent_name)</span></div>
                        <div><span className="text-blue-600">user_id</span>: <span className="text-gray-600">string (requerido) - ID de sesión o teléfono para agrupar conversaciones</span></div>
                        <div><span className="text-blue-600">phone_id</span>: <span className="text-gray-600">string (opcional) - Número de teléfono para WhatsApp o Telegram (solo si aplica)</span></div>
                        <div><span className="text-blue-600">message-Human</span>: <span className="text-gray-600">string - Mensaje del usuario. Si envía un PDF sin texto, usar &quot;[Archivo] nombre.pdf&quot;</span></div>
                        <div><span className="text-blue-600">message-AI</span>: <span className="text-gray-600">string - Respuesta del agente/AI</span></div>
                        <div><span className="text-blue-600">file_name</span>: <span className="text-gray-600">string (opcional) - Nombre del archivo enviado (PDF u otro). No enviar el binario</span></div>
                        <div><span className="text-blue-600">file_mime</span>: <span className="text-gray-600">string (opcional) - MIME del archivo, ej. application/pdf</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Notas Importantes */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Notas Importantes</h3>
                    <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                      <li>El campo <code className="bg-gray-200 px-1 rounded">type</code> debe ser exactamente <code className="bg-gray-200 px-1 rounded">&quot;agent&quot;</code></li>
                      <li>El campo <code className="bg-gray-200 px-1 rounded">agent</code> debe coincidir exactamente con el <code className="bg-gray-200 px-1 rounded">conversation_agent_name</code> configurado en el agente</li>
                      <li>El campo <code className="bg-gray-200 px-1 rounded">datetime</code> debe estar en formato ISO 8601 (ejemplo: 2024-01-15T10:30:00Z)</li>
                      <li>El campo <code className="bg-gray-200 px-1 rounded">id</code> debe ser único para cada mensaje</li>
                      <li>El campo <code className="bg-gray-200 px-1 rounded">user_id</code> es el ID de sesión o teléfono usado para agrupar conversaciones</li>
                      <li>El campo <code className="bg-gray-200 px-1 rounded">phone_id</code> solo se incluye cuando es WhatsApp o Telegram, debe ser el número completo</li>
                      <li>Los campos <code className="bg-gray-200 px-1 rounded">message-Human</code> y <code className="bg-gray-200 px-1 rounded">message-AI</code> son ambos obligatorios en cada inserción</li>
                      <li>Si el usuario envía un PDF u otro archivo, envía <code className="bg-gray-200 px-1 rounded">file_name</code> y <code className="bg-gray-200 px-1 rounded">file_mime</code>. No guardes el PDF (ni base64). En <code className="bg-gray-200 px-1 rounded">message-Human</code> usa el caption o <code className="bg-gray-200 px-1 rounded">[Archivo] nombre.pdf</code></li>
                      <li>Las conversaciones se agrupan automáticamente por <code className="bg-gray-200 px-1 rounded">user_id</code></li>
                      <li>Necesitarás tu API Key de Meilisearch para autenticación</li>
                    </ul>
                  </div>

                  {/* Ejemplo con múltiples documentos */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Insertar múltiples mensajes</h3>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{`curl -X POST 'https://server-search.zeroazul.com/indexes/bd_conversations_dworkers/documents' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_MEILISEARCH_API_KEY' \\
  -d '[
    {
      "id": "conv-001",
      "type": "agent",
      "datetime": "2024-01-15T10:30:00Z",
      "agent": "nombre-del-agente",
      "user_id": "user-123",
      "phone_id": "+573001234567",
      "message-Human": "Hola",
      "message-AI": "Hola, ¿en qué puedo ayudarte?"
    },
    {
      "id": "conv-002",
      "type": "agent",
      "datetime": "2024-01-15T10:31:00Z",
      "agent": "nombre-del-agente",
      "user_id": "user-123",
      "message-Human": "Quiero información",
      "message-AI": "Claro, aquí tienes la información que solicitas"
    }
  ]'`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}

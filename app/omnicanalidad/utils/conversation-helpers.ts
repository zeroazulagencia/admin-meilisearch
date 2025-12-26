import { Document, Conversation, Message } from './types';

export function groupDocumentsIntoConversations(documents: Document[]): Conversation[] {
  const groups = new Map<string, Document[]>();

  documents.forEach(doc => {
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
        break;
      }
    }
    
    let groupKey: string | null = null;
    
    // Prioridad 1: Si hay phone_id Y user_id, combinar ambos
    if (phoneId && phoneId !== 'unknown' && String(phoneId).trim().length > 0 && 
        userId && userId !== 'unknown' && userId.length > 0) {
      groupKey = `phone_${String(phoneId).trim()}_user_${userId}`;
    } 
    // Prioridad 2: Si solo hay phone_id sin user_id válido
    else if (phoneId && phoneId !== 'unknown' && String(phoneId).trim().length > 0) {
      groupKey = `phone_${String(phoneId).trim()}`;
    } 
    // Prioridad 3: session_id
    else {
      const sessionId = doc.session_id;
      if (sessionId && sessionId !== 'unknown' && String(sessionId).trim().length > 0) {
        groupKey = `session_${String(sessionId).trim()}`;
      } 
      // Prioridad 4: Solo user_id
      else if (userId && userId !== 'unknown' && userId.length > 0) {
        groupKey = `user_${userId}`;
      }
    }
    
    if (groupKey) {
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(doc);
    }
  });

  // Convertir a array de conversaciones
  const conversations: Conversation[] = Array.from(groups.entries()).map(([groupKey, messages]) => {
    // Ordenar mensajes por datetime
    const sortedMessages = messages.sort((a, b) => {
      const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
      const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
      return dateA - dateB;
    });
    
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    
    // Extraer phone_id y user_id del grupo
    const rawPhoneId = lastMessage.phone_number_id || lastMessage.phone_id || '';
    const phoneId = rawPhoneId ? String(rawPhoneId).trim() : '';
    
    // Determinar user_id
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

    // Extraer último mensaje
    const lastHumanMessage = lastMessage['message-Human'] || '';
    const lastAIMessage = lastMessage['message-AI'] || '';
    const lastMessageText = lastHumanMessage || lastAIMessage || 'Sin mensajes';
    
    // Extraer nombre del contacto
    const name = extractContactName(sortedMessages);
    
    // Generar avatar iniciales
    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    
    return {
      id: groupKey,
      name,
      avatar,
      channel: 'WhatsApp', // Por ahora siempre WhatsApp, se puede extender
      lastMessage: lastMessageText.length > 60 ? lastMessageText.substring(0, 60) + '...' : lastMessageText,
      timestamp: formatConversationTimestamp(lastMessage.datetime || ''),
      lastMessageTime: lastMessage.datetime || new Date().toISOString(),
      unreadCount: 0, // Se calculará en el backend
      labels: [],
      user_id: userId,
      phone_number_id: phoneId || undefined
    };
  });

  // Ordenar por último mensaje (más reciente primero)
  return conversations.sort((a, b) => {
    return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
  });
}

export function formatConversationTimestamp(datetime: string): string {
  if (!datetime) return '';
  
  const date = new Date(datetime);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) {
    return 'Ahora';
  } else if (diffMins < 60) {
    return `${diffMins}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}w`;
  } else if (diffMonths < 12) {
    return `${diffMonths}mo`;
  } else {
    const years = Math.floor(diffMonths / 12);
    return `${years}y`;
  }
}

export function extractContactName(documents: Document[]): string {
  // Intentar extraer nombre de varios campos posibles
  for (const doc of documents) {
    if (doc.name) return String(doc.name);
    if (doc.contact_name) return String(doc.contact_name);
    if (doc.user_name) return String(doc.user_name);
    if (doc.customer_name) return String(doc.customer_name);
  }
  
  // Si no hay nombre, usar user_id o phone_number_id
  const lastDoc = documents[documents.length - 1];
  const userId = lastDoc.user_id || lastDoc.iduser || lastDoc.userid;
  const phoneId = lastDoc.phone_number_id || lastDoc.phone_id;
  
  if (userId && userId !== 'unknown') {
    return `Usuario ${String(userId).slice(-4)}`;
  } else if (phoneId && phoneId !== 'unknown') {
    return `Tel. ${String(phoneId).slice(-4)}`;
  }
  
  return 'Sin nombre';
}

export function documentsToMessages(documents: Document[]): Message[] {
  const messages: Message[] = [];
  
  // Ordenar documentos por datetime
  const sortedDocs = documents.sort((a, b) => {
    const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
    const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
    return dateA - dateB;
  });
  
  sortedDocs.forEach(doc => {
    const humanMessage = doc['message-Human'];
    const aiMessage = doc['message-AI'];
    
    // Si hay mensaje del humano
    if (humanMessage && humanMessage.trim()) {
      messages.push({
        id: `${doc.id || Date.now()}_human`,
        type: 'customer',
        content: humanMessage,
        datetime: doc.datetime || new Date().toISOString(),
        sender: extractContactName([doc])
      });
    }
    
    // Si hay mensaje de la AI/agente
    if (aiMessage && aiMessage.trim()) {
      messages.push({
        id: `${doc.id || Date.now()}_ai`,
        type: 'agent',
        content: aiMessage,
        datetime: doc.datetime || new Date().toISOString(),
        status: 'read'
      });
    }
  });
  
  return messages;
}


import { Document } from '@/utils/meilisearch';

export interface Conversation {
  id: string;
  user_id: string;
  phone_number_id: string;
  agent: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'active' | 'waiting' | 'closed';
  messages: Message[];
}

export interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  image_base64?: string;
}

export interface PendingMessage {
  id: string;
  message: string;
  status: 'sending' | 'sent' | 'error';
  timestamp: string;
  messageId?: string;
}

export interface HumanModeStatus {
  isHumanMode: boolean;
  takenBy?: number;
  takenAt?: string;
}

export interface AgentDB {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  photo?: string;
  conversation_agent_name?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
}

/**
 * Agrupa documentos de Meilisearch en conversaciones
 */
export function groupDocumentsIntoConversations(
  documents: Document[],
  selectedAgent: string
): Conversation[] {
  const groups = new Map<string, Document[]>();

  documents.forEach(doc => {
    const phoneId = doc.phone_id || doc.phone_number_id;
    
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
    
    if (phoneId && phoneId !== 'unknown' && String(phoneId).trim().length > 0 && 
        userId && userId !== 'unknown' && userId.length > 0) {
      groupKey = `phone_${String(phoneId).trim()}_user_${userId}`;
    } else if (phoneId && phoneId !== 'unknown' && String(phoneId).trim().length > 0) {
      groupKey = `phone_${String(phoneId).trim()}`;
    } else {
      const sessionId = doc.session_id;
      if (sessionId && sessionId !== 'unknown' && String(sessionId).trim().length > 0) {
        groupKey = `session_${String(sessionId).trim()}`;
      } else if (userId && userId !== 'unknown' && userId.length > 0) {
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

  const conversationGroupsArray: Conversation[] = Array.from(groups.entries()).map(([groupKey, messages]) => {
    const sortedMessages = messages.sort((a, b) => {
      const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
      const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
      return dateA - dateB;
    });
    
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    
    const rawPhoneId = lastMessage.phone_number_id || lastMessage.phone_id || '';
    const phoneId = rawPhoneId ? String(rawPhoneId).trim() : '';
    const sessionId = lastMessage.session_id ? String(lastMessage.session_id).trim() : '';
    
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
    
    if (!userId) {
      const parts = groupKey.split('_');
      if (parts.length > 1) {
        userId = parts.slice(1).join('_');
      } else {
        userId = groupKey;
      }
    }
    
    if (!userId) {
      userId = 'unknown';
    }
    
    let lastMessageText = '';
    if (lastMessage['message-Human']) {
      lastMessageText = lastMessage['message-Human'].substring(0, 50);
    } else if (lastMessage['message-AI']) {
      lastMessageText = lastMessage['message-AI'].substring(0, 50);
    } else if (lastMessage['message']) {
      lastMessageText = lastMessage['message'].substring(0, 50);
    }
    
    const formattedMessages: Message[] = [];
    sortedMessages.forEach((msg, idx) => {
      const hasHuman = msg['message-Human'] && msg['message-Human'].trim() !== '';
      const hasAI = msg['message-AI'] && msg['message-AI'].trim() !== '';
      const hasMessage = msg['message'] && msg['message'].trim() !== '';
      
      // Si tiene message-Human, crear mensaje de usuario
      if (hasHuman || (hasMessage && msg.type === 'user')) {
        formattedMessages.push({
          id: `${msg.id || `msg-${idx}`}-user`,
          type: 'user',
          content: msg['message-Human'] || msg['message'] || '',
          timestamp: msg.datetime || new Date().toISOString(),
          status: 'sent',
          image_base64: msg['image_base64']
        });
      }
      
      // Si tiene message-AI, crear mensaje de agente (independiente)
      if (hasAI || (hasMessage && msg.type === 'agent')) {
        formattedMessages.push({
          id: `${msg.id || `msg-${idx}`}-agent`,
          type: 'agent',
          content: msg['message-AI'] || msg['message'] || '',
          timestamp: msg.datetime || new Date().toISOString(),
          status: 'sent',
          image_base64: msg['image_base64']
        });
      }
    });
    
    return {
      id: groupKey,
      user_id: userId,
      phone_number_id: phoneId || sessionId || '',
      agent: selectedAgent,
      lastMessage: lastMessageText,
      lastMessageTime: lastMessage.datetime || '',
      unreadCount: 0,
      status: 'active' as const,
      messages: formattedMessages
    };
  }).filter(group => {
    const userIdRaw = group.user_id;
    if (userIdRaw && userIdRaw !== null && userIdRaw !== undefined) {
      const userIdStr = String(userIdRaw).trim();
      return userIdStr.length > 0 && userIdStr.toLowerCase() !== 'unknown';
    }
    return false;
  }).sort((a, b) => {
    const dateA = new Date(a.lastMessageTime).getTime();
    const dateB = new Date(b.lastMessageTime).getTime();
    return dateB - dateA;
  });

  return conversationGroupsArray;
}

/**
 * Formatea una fecha para mostrar en el chat
 */
export function formatDate(dateString: string): string {
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
}

/**
 * Formatea una hora para mostrar en el chat
 */
export function formatTime(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}


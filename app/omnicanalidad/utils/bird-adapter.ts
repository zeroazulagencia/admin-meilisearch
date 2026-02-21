/**
 * Bird.com Data Adapter
 * Transforms Bird API responses to application format
 */

import { Conversation, Message } from './types';
import { BirdConversation, BirdMessage, BirdListResponse } from '@/utils/bird-api';

/**
 * Extract contact name from Bird conversation
 */
function extractContactName(conversation: BirdConversation): string {
  // Try to get name from featured participants
  if (conversation.featuredParticipants && conversation.featuredParticipants.length > 0) {
    // Find the first non-user participant (contact/customer)
    const contact = conversation.featuredParticipants.find(p => p.type === 'contact');
    if (contact?.displayName) {
      return contact.displayName;
    }
    // Fallback to first participant
    if (conversation.featuredParticipants[0]?.displayName) {
      return conversation.featuredParticipants[0].displayName;
    }
    // Use identifier value (phone number)
    if (conversation.featuredParticipants[0]?.identifierValue) {
      return conversation.featuredParticipants[0].identifierValue;
    }
  }
  
  // Use conversation name if available
  if (conversation.name) {
    return conversation.name;
  }
  
  // Fallback
  return 'Usuario';
}

/**
 * Extract avatar URL from Bird conversation
 */
function extractAvatar(conversation: BirdConversation): string {
  if (conversation.featuredParticipants && conversation.featuredParticipants.length > 0) {
    const contact = conversation.featuredParticipants.find(p => p.type === 'contact');
    if (contact?.avatarUrl) {
      return contact.avatarUrl;
    }
    if (conversation.featuredParticipants[0]?.avatarUrl) {
      return conversation.featuredParticipants[0].avatarUrl;
    }
  }
  return '';
}

/**
 * Extract user ID from Bird conversation
 */
function extractUserId(conversation: BirdConversation): string {
  if (conversation.featuredParticipants && conversation.featuredParticipants.length > 0) {
    const contact = conversation.featuredParticipants.find(p => p.type === 'contact');
    if (contact) {
      return contact.identifierValue || contact.id;
    }
    return conversation.featuredParticipants[0]?.id || conversation.id;
  }
  return conversation.id;
}

/**
 * Extract last message text from Bird conversation
 */
function extractLastMessage(conversation: BirdConversation): string {
  if (!conversation.lastMessage) {
    return '';
  }
  
  const body = conversation.lastMessage.body;
  if (body?.text?.text) {
    const text = body.text.text;
    return text.length > 60 ? text.substring(0, 60) + '...' : text;
  }
  
  if (body?.type === 'image') {
    return '[Imagen]';
  }
  
  if (body?.type === 'file') {
    return '[Archivo]';
  }
  
  return '';
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/**
 * Convert Bird conversation to app Conversation format
 */
export function adaptBirdConversation(
  birdConversation: BirdConversation,
  agentId?: number
): Conversation {
  const userId = extractUserId(birdConversation);
  const lastMessageTime = birdConversation.lastMessage?.createdAt || birdConversation.updatedAt;
  
  return {
    id: `bird_${birdConversation.id}`,
    name: extractContactName(birdConversation),
    avatar: extractAvatar(birdConversation),
    channel: 'Bird',
    lastMessage: extractLastMessage(birdConversation),
    timestamp: formatTimestamp(lastMessageTime),
    lastMessageTime: lastMessageTime,
    unreadCount: 0, // Will be calculated separately
    labels: [],
    agent_id: agentId,
    user_id: userId,
    phone_number_id: undefined, // Bird doesn't use phone_number_id
  };
}

/**
 * Convert array of Bird conversations to app format
 */
export function adaptBirdConversations(
  response: BirdListResponse<BirdConversation>,
  agentId?: number
): { conversations: Conversation[]; nextPageToken?: string; total?: number } {
  // Filter out closed/deleted conversations
  const activeConversations = response.results.filter(
    c => c.status === 'active'
  );
  
  const conversations = activeConversations.map(c => adaptBirdConversation(c, agentId));
  
  // Sort by last message time (newest first)
  conversations.sort((a, b) => {
    const dateA = new Date(a.lastMessageTime).getTime();
    const dateB = new Date(b.lastMessageTime).getTime();
    return dateB - dateA;
  });
  
  return {
    conversations,
    nextPageToken: response.nextPageToken,
    total: response.total,
  };
}

/**
 * Convert Bird message to app Message format
 */
export function adaptBirdMessage(birdMessage: BirdMessage): Message {
  // Determine message type based on sender type
  let type: 'customer' | 'agent' | 'system' = 'customer';
  if (birdMessage.sender.type === 'user' || birdMessage.sender.type === 'agent') {
    type = 'agent';
  } else if (birdMessage.sender.type === 'system') {
    type = 'system';
  }
  
  // Extract message content
  let content = '';
  const body = birdMessage.body;
  if (body?.text?.text) {
    content = body.text.text;
  } else if (body?.image?.url) {
    content = body.image.caption || '[Imagen]';
  } else if (body?.file?.url) {
    content = body.file.filename || '[Archivo]';
  }
  
  // Extract image URL if present
  const imageUrl = body?.image?.url;
  
  return {
    id: birdMessage.id,
    type,
    content,
    datetime: birdMessage.createdAt,
    sender: birdMessage.sender.displayName,
    status: birdMessage.status as 'sent' | 'delivered' | 'read' | undefined,
    imageUrl,
  };
}

/**
 * Convert array of Bird messages to app format
 */
export function adaptBirdMessages(
  response: BirdListResponse<BirdMessage>
): { messages: Message[]; nextPageToken?: string } {
  const messages = response.results.map(m => adaptBirdMessage(m));
  
  // Sort by datetime (oldest first for chat display)
  messages.sort((a, b) => {
    const dateA = new Date(a.datetime).getTime();
    const dateB = new Date(b.datetime).getTime();
    return dateA - dateB;
  });
  
  return {
    messages,
    nextPageToken: response.nextPageToken,
  };
}

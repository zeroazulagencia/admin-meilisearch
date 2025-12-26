export interface Conversation {
  id: string; // Formato: phone_XXX_user_YYY o user_YYY
  name: string;
  avatar: string;
  channel: string;
  lastMessage: string;
  timestamp: string;
  lastMessageTime: string; // ISO string para ordenamiento
  unreadCount: number;
  priority?: boolean;
  labels: string[];
  agent_id?: number;
  user_id: string;
  phone_number_id?: string;
}

export interface Message {
  id: string;
  type: 'customer' | 'agent' | 'system';
  content: string;
  datetime: string;
  sender?: string;
  status?: 'sent' | 'delivered' | 'read';
  imageUrl?: string;
}

export interface ConversationRead {
  id: number;
  agent_id: number;
  user_id: string;
  phone_number_id: string;
  read_by: number; // client_id
  last_read_datetime: string | null;
  last_message_datetime: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  [key: string]: any;
  id?: string;
  type?: string;
  datetime?: string;
  agent?: string;
  user_id?: string;
  phone_id?: string;
  phone_number_id?: string;
  session_id?: string;
  'message-Human'?: string;
  'message-AI'?: string;
}


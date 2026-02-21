/**
 * Bird.com API Client
 * Handles communication with Bird Conversations API
 */

const BIRD_API_BASE = 'https://api.bird.com';

export interface BirdConversation {
  id: string;
  name?: string;
  description?: string;
  status: 'active' | 'closed' | 'deleted';
  visibility: 'public' | 'private' | 'direct' | 'group';
  accessibility: 'open' | 'invite-only' | 'request-to-join' | 'private';
  featuredParticipants: BirdParticipant[];
  activeParticipantCount: number;
  pendingParticipantCount: number;
  channelId?: string;
  lastMessage?: BirdMessage;
  createdAt: string;
  updatedAt: string;
  platformStyle?: string;
}

export interface BirdParticipant {
  id: string;
  type: string;
  displayName?: string;
  avatarUrl?: string;
  identifierKey?: string;
  identifierValue?: string;
}

export interface BirdMessage {
  id: string;
  conversationId: string;
  reference?: string;
  sender: {
    id: string;
    type: string;
    displayName?: string;
    avatarUrl?: string;
  };
  draft?: boolean;
  recipients?: BirdRecipient[];
  status?: string;
  source?: string;
  body: BirdMessageBody;
  interactions?: any[];
  createdAt: string;
  updatedAt?: string;
}

export interface BirdRecipient {
  type: string;
  id: string;
  identifierKey?: string;
  identifierValue?: string;
}

export interface BirdMessageBody {
  type: string;
  text?: {
    text: string;
  };
  image?: {
    url: string;
    caption?: string;
  };
  file?: {
    url: string;
    filename?: string;
  };
}

export interface BirdListResponse<T> {
  results: T[];
  nextPageToken?: string;
  total?: number;
}

export interface BirdListOptions {
  limit?: number;
  pageToken?: string;
  reverse?: boolean;
  dateFrom?: string;
  resource?: string;
}

/**
 * Make authenticated request to Bird API
 */
async function birdRequest<T>(
  apiKey: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BIRD_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `AccessKey ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[BIRD API] Error:', response.status, errorText);
    throw new Error(`Bird API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * List conversations from Bird workspace
 */
export async function listConversations(
  apiKey: string,
  workspaceId: string,
  options: BirdListOptions = {}
): Promise<BirdListResponse<BirdConversation>> {
  const params = new URLSearchParams();
  
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.pageToken) params.append('pageToken', options.pageToken);
  if (options.reverse) params.append('reverse', 'true');
  if (options.resource) params.append('resource', options.resource);

  const queryString = params.toString();
  const endpoint = `/workspaces/${workspaceId}/conversations${queryString ? `?${queryString}` : ''}`;

  console.log('[BIRD API] Fetching conversations:', endpoint);
  
  return birdRequest<BirdListResponse<BirdConversation>>(apiKey, endpoint);
}

/**
 * List messages from a Bird conversation
 */
export async function listMessages(
  apiKey: string,
  workspaceId: string,
  conversationId: string,
  options: BirdListOptions = {}
): Promise<BirdListResponse<BirdMessage>> {
  const params = new URLSearchParams();
  
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.pageToken) params.append('pageToken', options.pageToken);
  if (options.reverse) params.append('reverse', 'true');
  if (options.dateFrom) params.append('dateFrom', options.dateFrom);

  const queryString = params.toString();
  const endpoint = `/workspaces/${workspaceId}/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;

  console.log('[BIRD API] Fetching messages:', endpoint);
  
  return birdRequest<BirdListResponse<BirdMessage>>(apiKey, endpoint);
}

/**
 * Get a single conversation
 */
export async function getConversation(
  apiKey: string,
  workspaceId: string,
  conversationId: string
): Promise<BirdConversation> {
  const endpoint = `/workspaces/${workspaceId}/conversations/${conversationId}`;
  
  return birdRequest<BirdConversation>(apiKey, endpoint);
}

/**
 * Send a message to a Bird conversation
 */
export async function sendMessage(
  apiKey: string,
  workspaceId: string,
  conversationId: string,
  text: string
): Promise<BirdMessage> {
  const endpoint = `/workspaces/${workspaceId}/conversations/${conversationId}/messages`;
  
  return birdRequest<BirdMessage>(apiKey, endpoint, {
    method: 'POST',
    body: JSON.stringify({
      body: {
        type: 'text',
        text: { text }
      }
    }),
  });
}

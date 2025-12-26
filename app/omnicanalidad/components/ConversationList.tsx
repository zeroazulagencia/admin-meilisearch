'use client';

import { Conversation } from '../utils/omnicanalidad-helpers';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentAgent: string;
  loading?: boolean;
}

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  currentAgent,
  loading = false
}: ConversationListProps) {
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const queryLower = searchQuery.toLowerCase();
    return conv.user_id.toLowerCase().includes(queryLower) ||
           conv.phone_number_id.toLowerCase().includes(queryLower) ||
           conv.lastMessage.toLowerCase().includes(queryLower) ||
           conv.messages.some(msg => msg.content.toLowerCase().includes(queryLower));
  });

  return (
    <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white flex-shrink-0 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <h2 className="font-semibold text-gray-900 text-sm">{currentAgent || 'Todas las conversaciones'}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{filteredConversations.length} conversaciones</p>
      </div>

      {/* Búsqueda */}
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0 bg-gray-50">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar conversaciones..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm bg-white"
          style={{ '--tw-ring-color': '#3B82F6' } as React.CSSProperties & { '--tw-ring-color': string }}
        />
      </div>

      {/* Lista de conversaciones */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block animate-spin h-6 w-6 border-2 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
              <p className="mt-2 text-sm text-gray-600">Cargando...</p>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No hay conversaciones</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-[#3B82F6]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#5DE1E5] flex items-center justify-center overflow-hidden">
                  {conversation.phone_number_id ? (
                    <span className="text-sm font-semibold text-white">
                      {conversation.phone_number_id.substring(conversation.phone_number_id.length - 1)}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      {conversation.user_id.substring(conversation.user_id.length - 1)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-0.5">
                    <span className="font-medium text-gray-900 truncate text-sm">{conversation.user_id}</span>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{formatTime(conversation.lastMessageTime)}</span>
                  </div>
                  {conversation.phone_number_id && conversation.phone_number_id.trim() !== '' && (
                    <p className="text-xs text-gray-500 mb-1 truncate">{conversation.phone_number_id}</p>
                  )}
                  <p className="text-sm text-gray-600 truncate leading-tight">
                    {conversation.lastMessage}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <div className="mt-1">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-white bg-[#3B82F6] rounded-full">
                        {conversation.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


'use client';

import { useState } from 'react';
import { Conversation } from '../utils/types';

interface ConversationListPanelProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  conversations: Conversation[];
  loading: boolean;
}

export default function ConversationListPanel({ 
  selectedConversationId, 
  onSelectConversation,
  conversations,
  loading
}: ConversationListPanelProps) {
  const [activeTab, setActiveTab] = useState<'mine' | 'unassigned' | 'all'>('mine');

  // Filtrar conversaciones según el tab activo
  const filteredConversations = conversations.filter(conv => {
    if (activeTab === 'all') return true;
    // Por ahora, todas las conversaciones se muestran en todos los tabs
    // Se puede implementar lógica de "mine" y "unassigned" más adelante
    return true;
  });

  // Contar conversaciones por tab
  const mineCount = conversations.length; // Por ahora todas
  const unassignedCount = 0; // Por implementar
  const allCount = conversations.length;

  return (
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('mine')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'mine'
              ? 'text-[#3B82F6] border-b-2 border-[#3B82F6] bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Mine <span className="text-gray-400">{mineCount}</span>
        </button>
        <button
          onClick={() => setActiveTab('unassigned')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'unassigned'
              ? 'text-[#3B82F6] border-b-2 border-[#3B82F6] bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Unassigned <span className="text-gray-400">{unassignedCount}</span>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'text-[#3B82F6] border-b-2 border-[#3B82F6] bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          All <span className="text-gray-400">{allCount}</span>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-gray-500">Cargando conversaciones...</div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-gray-500">No hay conversaciones</div>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
              selectedConversationId === conversation.id ? 'bg-blue-50 border-l-4 border-l-[#3B82F6]' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#5DE1E5] flex items-center justify-center">
                <span className="text-sm font-semibold text-white">{conversation.avatar}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-gray-500 truncate">{conversation.channel}</span>
                    {conversation.priority && (
                      <span className="text-red-500 font-bold">!!!</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{conversation.timestamp}</span>
                </div>
                
                <p className="text-sm font-medium text-gray-900 mb-1 truncate">{conversation.name}</p>
                
                <p className="text-sm text-gray-600 truncate mb-2">{conversation.lastMessage}</p>
                
                {/* Labels */}
                {conversation.labels.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {conversation.labels.map((label, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          label === 'device-setup'
                            ? 'bg-red-100 text-red-700'
                            : label === 'lead'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Unread indicator */}
                {conversation.unreadCount && conversation.unreadCount > 0 && (
                  <div className="mt-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-[#3B82F6] text-white text-xs font-medium rounded-full">
                      {conversation.unreadCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))
        )}
      </div>
    </div>
  );
}


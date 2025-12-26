'use client';

import { useEffect, useRef } from 'react';
import { Message, PendingMessage } from '../utils/omnicanalidad-helpers';
import { formatTime } from '../utils/omnicanalidad-helpers';

interface ChatWindowProps {
  messages: Message[];
  pendingMessages: PendingMessage[];
  humanModeStatus: {
    isHumanMode: boolean;
    takenBy?: number;
    takenAt?: string;
  } | null;
  conversationInfo: {
    user_id: string;
    phone_number_id?: string;
    lastMessageTime?: string;
  } | null;
  onTakeConversation: () => void;
  onReleaseConversation: () => void;
  takingConversation: boolean;
  releasingConversation: boolean;
  canTakeConversation: boolean;
}

export default function ChatWindow({
  messages,
  pendingMessages,
  humanModeStatus,
  conversationInfo,
  onTakeConversation,
  onReleaseConversation,
  takingConversation,
  releasingConversation,
  canTakeConversation
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingMessages]);

  if (!conversationInfo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Selecciona una conversación</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base truncate">{conversationInfo.user_id}</h3>
            {conversationInfo.phone_number_id && conversationInfo.phone_number_id.trim() !== '' && (
              <p className="text-xs text-gray-500 truncate">{conversationInfo.phone_number_id}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* Indicador de Modo Humano */}
            {humanModeStatus?.isHumanMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-lg">
                <svg className="w-4 h-4 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs font-medium text-yellow-800">Modo Humano</span>
              </div>
            )}
            
            {/* Botón Tomar/Liberar Conversación */}
            {canTakeConversation && (
              <>
                {!humanModeStatus?.isHumanMode ? (
                  <button
                    onClick={onTakeConversation}
                    disabled={takingConversation}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                    title="Tomar conversación (pausar agente automático)"
                  >
                    {takingConversation ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Tomando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        <span>Tomar Conversación</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={onReleaseConversation}
                    disabled={releasingConversation}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                    title="Liberar conversación (reactivar agente automático)"
                  >
                    {releasingConversation ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Liberando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Liberar Conversación</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div 
        id="chat-messages-container"
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 min-h-0"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Mensajes pendientes/enviados */}
        {pendingMessages.map((pendingMsg) => (
          <div key={pendingMsg.id} className="flex justify-end mb-1">
            <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
              pendingMsg.status === 'error' 
                ? 'bg-red-500 text-white' 
                : pendingMsg.status === 'sending'
                ? 'bg-blue-400 text-white'
                : 'bg-[#3B82F6] text-white'
            }`} style={{ 
              borderRadius: '18px 18px 4px 18px'
            }}>
              <p className="text-sm whitespace-pre-wrap break-words">{pendingMsg.message}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <p className="text-xs opacity-80">
                  {formatTime(pendingMsg.timestamp)}
                </p>
                {pendingMsg.status === 'sending' && (
                  <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full ml-1"></div>
                )}
                {pendingMsg.status === 'sent' && (
                  <>
                    <svg className="w-4 h-4 text-blue-200 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
                {pendingMsg.status === 'error' && (
                  <svg className="w-4 h-4 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Mensajes de la conversación */}
        {messages.map((message, index) => {
          const hasImage = message.image_base64 && message.image_base64.trim() !== '';
          
          if (message.type === 'user') {
            return (
              <div key={message.id || index} className="flex justify-end mb-1">
                <div className="max-w-[75%] bg-[#3B82F6] text-white rounded-2xl px-4 py-2 shadow-sm" style={{ 
                  borderRadius: '18px 18px 4px 18px'
                }}>
                  {hasImage && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                      <img 
                        src={message.image_base64} 
                        alt="Imagen del mensaje" 
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <p className="text-xs text-green-100">
                      {formatTime(message.timestamp)}
                    </p>
                    <svg className="w-4 h-4 text-blue-200 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          } else {
            return (
              <div key={message.id || index} className="flex justify-start mb-1">
                <div className="max-w-[75%] bg-white rounded-2xl px-4 py-2 shadow-sm border border-gray-200" style={{ 
                  borderRadius: '18px 18px 18px 4px'
                }}>
                  {hasImage && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                      <img 
                        src={message.image_base64} 
                        alt="Imagen del mensaje" 
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                  )}
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{message.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            );
          }
        })}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}


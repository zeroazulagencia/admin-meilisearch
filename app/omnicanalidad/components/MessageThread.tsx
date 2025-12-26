'use client';

import { useEffect, useRef } from 'react';
import { Message } from '../utils/types';

interface MessageThreadProps {
  messages: Message[];
  loading: boolean;
}

export default function MessageThread({ messages, loading }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático al último mensaje
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-500">Cargando mensajes...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-500">No hay mensajes</div>
      </div>
    );
  }

  const formatMessageTime = (datetime: string) => {
    const date = new Date(datetime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="p-6 space-y-4">
      {messages.map((message) => {
        if (message.type === 'customer') {
          return (
            <div key={message.id} className="flex justify-start">
              <div className="max-w-[75%] bg-gray-100 rounded-2xl px-4 py-3 shadow-sm" style={{ borderRadius: '18px 18px 18px 4px' }}>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{message.content}</p>
                <p className="text-xs text-gray-500 mt-1">{formatMessageTime(message.datetime)}</p>
              </div>
            </div>
          );
        } else if (message.type === 'agent') {
          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[75%] bg-[#3B82F6] text-white rounded-2xl px-4 py-3 shadow-sm" style={{ borderRadius: '18px 18px 4px 18px' }}>
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <p className="text-xs text-blue-100">{formatMessageTime(message.datetime)}</p>
                  {message.status === 'read' && (
                    <>
                      <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        } else if (message.type === 'system') {
          return (
            <div key={message.id} className="flex justify-center">
              <div className="bg-gray-100 rounded-lg px-3 py-2 max-w-[75%]">
                <p className="text-xs text-gray-600 text-center">{message.content}</p>
                <p className="text-xs text-gray-400 text-center mt-1">{formatMessageTime(message.datetime)}</p>
              </div>
            </div>
          );
        }
        return null;
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

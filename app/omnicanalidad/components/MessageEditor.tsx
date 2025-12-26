'use client';

import { useState } from 'react';

interface MessageEditorProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
}

export default function MessageEditor({ onSendMessage, disabled = false }: MessageEditorProps) {
  const [activeTab, setActiveTab] = useState<'reply' | 'private'>('reply');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveTab('reply')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'reply'
              ? 'bg-[#3B82F6] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Reply
        </button>
        <button
          onClick={() => setActiveTab('private')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'private'
              ? 'bg-[#3B82F6] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Private Note
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 rounded-t-lg border border-b-0 border-gray-200">
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Bold">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Italic">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Link">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Undo">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Redo">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="List">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Code">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      </div>

      {/* Text Area */}
      <div className="relative border border-gray-200 rounded-b-lg">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !sending && !disabled) {
              e.preventDefault();
              if (message.trim()) {
                onSendMessage(message).then(() => {
                  setMessage('');
                }).catch((e: any) => {
                  console.error('[MessageEditor] Error enviando mensaje:', e?.message);
                  alert('Error al enviar mensaje: ' + (e?.message || 'Error desconocido'));
                });
              }
            }
          }}
          placeholder="Shift + enter for new line. Start with '/' to select a Canned Response."
          className="w-full px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3B82F6] rounded-b-lg"
          rows={3}
          disabled={disabled || sending}
        />
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Emoji">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Attachment">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Microphone">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Pin">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
            AI Assist
          </button>
          <button 
            onClick={async () => {
              if (!message.trim() || sending || disabled) return;
              try {
                setSending(true);
                await onSendMessage(message);
                setMessage('');
              } catch (e: any) {
                console.error('[MessageEditor] Error enviando mensaje:', e?.message);
                alert('Error al enviar mensaje: ' + (e?.message || 'Error desconocido'));
              } finally {
                setSending(false);
              }
            }}
            disabled={!message.trim() || sending || disabled}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              !message.trim() || sending || disabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#3B82F6] hover:bg-[#2563EB] text-white'
            }`}
          >
            {sending ? 'Enviando...' : 'Send'}
            <span className="text-xs">(↵)</span>
          </button>
        </div>
      </div>
    </div>
  );
}


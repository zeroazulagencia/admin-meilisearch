'use client';

import { useState } from 'react';
import ContactInfo from './ContactInfo';
import MessageThread from './MessageThread';
import MessageEditor from './MessageEditor';
import ToolsSidebar from './ToolsSidebar';

interface ConversationDetailPanelProps {
  conversationId: string | null;
}

export default function ConversationDetailPanel({ conversationId }: ConversationDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'contact' | 'copilot'>('contact');

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Selecciona una conversación para ver los detalles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-white min-h-0">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'contact'
                ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Contact
          </button>
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'copilot'
                ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Copilot
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'contact' ? (
            <>
              {/* Contact Info */}
              <div className="flex-shrink-0 border-b border-gray-200">
                <ContactInfo />
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <MessageThread />
              </div>

              {/* Message Editor */}
              <div className="flex-shrink-0 border-t border-gray-200">
                <MessageEditor />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500">Copilot view - Coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Tools Sidebar */}
      <ToolsSidebar />
    </div>
  );
}


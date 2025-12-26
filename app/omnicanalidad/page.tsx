'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import ConversationListPanel from './components/ConversationListPanel';
import ConversationDetailPanel from './components/ConversationDetailPanel';
import { useState } from 'react';

export default function Omnicanalidad() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <ProtectedLayout>
      <div className="flex flex-col h-full overflow-hidden -m-4 lg:-m-6 bg-gray-50">
        {/* Top Bar */}
        <TopBar />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Sidebar Left */}
          <Sidebar />

          {/* Conversation List Panel */}
          <ConversationListPanel 
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />

          {/* Conversation Detail Panel */}
          <ConversationDetailPanel 
            conversationId={selectedConversationId}
          />
        </div>
      </div>
    </ProtectedLayout>
  );
}

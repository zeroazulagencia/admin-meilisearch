'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import ConversationListPanel from './components/ConversationListPanel';
import ConversationDetailPanel from './components/ConversationDetailPanel';
import { useConversations } from './hooks/useConversations';

export default function Omnicanalidad() {
  const {
    conversations,
    selectedConversation,
    messages,
    loading,
    loadingMessages,
    selectedAgentName,
    totalUnreadCount,
    selectConversation,
    sendMessage,
    setSelectedAgentName
  } = useConversations();

  const handleSelectConversation = async (conversationId: string) => {
    await selectConversation(conversationId);
  };

  const handleSendMessage = async (message: string) => {
    if (selectedConversation) {
      await sendMessage(selectedConversation.id, message);
    }
  };

  return (
    <ProtectedLayout>
      <div className="flex flex-col h-full overflow-hidden -m-4 lg:-m-6 bg-gray-50">
        {/* Top Bar */}
        <TopBar 
          selectedAgentName={selectedAgentName}
          onAgentChange={setSelectedAgentName}
          totalUnreadCount={totalUnreadCount}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Sidebar Left */}
          <Sidebar />

          {/* Conversation List Panel */}
          <ConversationListPanel 
            selectedConversationId={selectedConversation?.id || null}
            onSelectConversation={handleSelectConversation}
            conversations={conversations}
            loading={loading}
          />

          {/* Conversation Detail Panel */}
          <ConversationDetailPanel 
            conversationId={selectedConversation?.id || null}
            conversation={selectedConversation}
            messages={messages}
            loadingMessages={loadingMessages}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </ProtectedLayout>
  );
}

'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import AgentSelector from '@/components/ui/AgentSelector';
import { useOmnicanalidad } from './hooks/useOmnicanalidad';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';

export default function Omnicanalidad() {
  const {
    allPlatformAgents,
    agentsInitialized,
    conversations,
    selectedConversation,
    setSelectedConversation,
    selectedPlatformAgent,
    setSelectedPlatformAgent,
    currentAgentDetails,
    humanModeStatus,
    pendingMessages,
    loadingConversations,
    takingConversation,
    releasingConversation,
    sendingMessage,
    messageInput,
    setMessageInput,
    searchQuery,
    setSearchQuery,
    handleTakeConversation,
    handleReleaseConversation,
    handleSendMessage
  } = useOmnicanalidad();

  const currentAgent = selectedConversation?.agent || 'all';

  return (
    <ProtectedLayout>
      <div className="flex flex-col h-full overflow-hidden -m-4 lg:-m-6">
        {/* Header compacto */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Omnicanalidad</h1>
          <div className="flex items-center gap-4 flex-1 max-w-md ml-8">
            <AgentSelector
              label=""
              agents={allPlatformAgents}
              selectedAgent={selectedPlatformAgent}
              onChange={(agent) => {
                if (typeof agent === 'string') {
                  setSelectedPlatformAgent(agent);
                } else if (agent === null) {
                  setSelectedPlatformAgent('all');
                } else {
                  setSelectedPlatformAgent(agent.id.toString());
                }
              }}
              placeholder="Seleccionar agente..."
              includeAllOption={true}
              allOptionLabel="Todos los agentes"
              getDisplayText={(agent) => {
                if (agent.id === 'all') return agent.name;
                return `${agent.name} ${agent.conversation_agent_name ? `(${agent.conversation_agent_name})` : ''}`;
              }}
              loading={!agentsInitialized}
              className="w-full"
            />
            {selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {(() => {
                  const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
                  return agent?.photo ? (
                    <img
                      src={agent.photo}
                      alt={agent.name}
                      className="w-8 h-8 rounded-full object-cover border border-gray-300"
                    />
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Panel principal de chat */}
        {selectedPlatformAgent === 'all' || !selectedPlatformAgent ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-hidden">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Selecciona un agente para ver sus conversaciones</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden bg-white min-h-0">
            {/* Panel izquierdo - Lista de conversaciones */}
            <ConversationList
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              currentAgent={currentAgent}
              loading={loadingConversations}
            />

            {/* Panel derecho - Chat */}
            <div className="flex-1 flex flex-col border-l border-gray-200 min-h-0 overflow-hidden">
              <ChatWindow
                messages={selectedConversation?.messages || []}
                pendingMessages={pendingMessages}
                humanModeStatus={humanModeStatus}
                conversationInfo={selectedConversation ? {
                  user_id: selectedConversation.user_id,
                  phone_number_id: selectedConversation.phone_number_id,
                  lastMessageTime: selectedConversation.lastMessageTime
                } : null}
                onTakeConversation={handleTakeConversation}
                onReleaseConversation={handleReleaseConversation}
                takingConversation={takingConversation}
                releasingConversation={releasingConversation}
                canTakeConversation={!!currentAgentDetails && !!currentAgentDetails.whatsapp_phone_number_id}
              />
              
              {/* Input de mensaje (solo en modo humano) */}
              {humanModeStatus?.isHumanMode && (
                <MessageInput
                  value={messageInput}
                  onChange={setMessageInput}
                  onSend={handleSendMessage}
                  disabled={!humanModeStatus?.isHumanMode}
                  sending={sendingMessage}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}


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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Omnicanalidad</h1>
      </div>
      
      {/* Selector de Agente */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <AgentSelector
          label="Seleccionar Agente"
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
          placeholder="Todos los agentes"
          includeAllOption={true}
          allOptionLabel="Todos los agentes"
          getDisplayText={(agent) => {
            if (agent.id === 'all') return agent.name;
            return `${agent.name} ${agent.conversation_agent_name ? `(${agent.conversation_agent_name})` : '(sin identificar)'}`;
          }}
          loading={!agentsInitialized}
          className="w-full"
        />
        {selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
          <div className="mt-3">
            {(() => {
              const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
              return agent ? (
                <div className="flex items-center gap-3">
                  {agent.photo && (
                    <img
                      src={agent.photo}
                      alt={agent.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    {agent.description && (
                      <p className="text-sm text-gray-500">{agent.description}</p>
                    )}
                    {agent.conversation_agent_name && (
                      <p className="text-xs text-gray-400">ID: {agent.conversation_agent_name}</p>
                    )}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </div>

      {/* Panel principal de chat */}
      {selectedPlatformAgent === 'all' || !selectedPlatformAgent ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Selecciona un agente para ver sus conversaciones</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
          <div className="flex h-full">
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
            <div className="flex-1 flex flex-col">
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
        </div>
      )}
    </ProtectedLayout>
  );
}


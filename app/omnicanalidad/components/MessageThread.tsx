'use client';

interface Message {
  id: string;
  type: 'customer' | 'agent' | 'system' | 'private';
  content: string;
  timestamp: string;
  sender?: string;
  status?: 'sent' | 'delivered' | 'read';
}

// Mock messages
const mockMessages: Message[] = [
  {
    id: '1',
    type: 'customer',
    content: "Hi, I need some help setting up my new device.",
    timestamp: 'Jan 15, 12:32 PM'
  },
  {
    id: '2',
    type: 'agent',
    content: "No problem! Can you please tell me the make and model of your device and what specifically you need help with?",
    timestamp: 'Jan 15, 12:32 PM',
    status: 'read'
  },
  {
    id: '3',
    type: 'system',
    content: 'Mathew M self-assigned this conversation',
    timestamp: 'Jan 15, 12:33 PM',
    sender: 'System'
  },
  {
    id: '4',
    type: 'system',
    content: 'Mathew M set the priority to high',
    timestamp: 'Jan 15, 12:33 PM',
    sender: 'System'
  },
  {
    id: '5',
    type: 'system',
    content: 'Mathew M added device-setup',
    timestamp: 'Jan 15, 12:33 PM',
    sender: 'System'
  },
  {
    id: '6',
    type: 'private',
    content: '@Ben Nugent Can we use Captain here to automate these queries?',
    timestamp: 'Jan 16, 2:16 PM',
    sender: 'Mathew M'
  }
];

export default function MessageThread() {
  return (
    <div className="p-6 space-y-4">
      {mockMessages.map((message) => {
        if (message.type === 'customer') {
          return (
            <div key={message.id} className="flex justify-start">
              <div className="max-w-[75%] bg-gray-100 rounded-2xl px-4 py-3 shadow-sm" style={{ borderRadius: '18px 18px 18px 4px' }}>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{message.content}</p>
                <p className="text-xs text-gray-500 mt-1">{message.timestamp}</p>
              </div>
            </div>
          );
        } else if (message.type === 'agent') {
          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[75%] bg-[#3B82F6] text-white rounded-2xl px-4 py-3 shadow-sm" style={{ borderRadius: '18px 18px 4px 18px' }}>
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <p className="text-xs text-blue-100">{message.timestamp}</p>
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
                <p className="text-xs text-gray-400 text-center mt-1">{message.timestamp}</p>
              </div>
            </div>
          );
        } else if (message.type === 'private') {
          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[75%] bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 shadow-sm" style={{ borderRadius: '18px 18px 4px 18px' }}>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs font-medium text-yellow-800">Private Note</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{message.content}</p>
                <p className="text-xs text-gray-500 mt-1">{message.timestamp}</p>
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}


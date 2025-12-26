'use client';

import { useState } from 'react';

interface CollapsibleToolSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleToolSection({ title, children, defaultOpen = false }: CollapsibleToolSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ToolsSidebar() {
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 h-full overflow-y-auto">
      <CollapsibleToolSection title="Conversation Actions" defaultOpen={true}>
        <div className="space-y-2">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            Assign to...
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            Set priority
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            Add label
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            Move to folder
          </button>
        </div>
      </CollapsibleToolSection>

      <CollapsibleToolSection title="Conversation participants">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#5DE1E5] flex items-center justify-center">
              <span className="text-xs font-semibold text-white">MM</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Mathew M</p>
              <p className="text-xs text-gray-500">Assigned</p>
            </div>
          </div>
        </div>
      </CollapsibleToolSection>

      <CollapsibleToolSection title="Macros">
        <div className="space-y-2">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            Welcome message
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            Common solutions
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            Escalation template
          </button>
        </div>
      </CollapsibleToolSection>

      <CollapsibleToolSection title="Contact Attributes">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Plan</p>
            <p className="text-sm text-gray-900">Premium</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <p className="text-sm text-gray-900">Active</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Last Contact</p>
            <p className="text-sm text-gray-900">3 days ago</p>
          </div>
        </div>
      </CollapsibleToolSection>

      <CollapsibleToolSection title="Conversation Information">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Channel</p>
            <p className="text-sm text-gray-900">Paperlayer Web</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Created</p>
            <p className="text-sm text-gray-900">Jan 15, 2025</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Priority</p>
            <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
              High
            </span>
          </div>
        </div>
      </CollapsibleToolSection>

      <CollapsibleToolSection title="Previous Conversations">
        <div className="space-y-2">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            <p className="font-medium">Device Setup Issue</p>
            <p className="text-xs text-gray-500">2 weeks ago</p>
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            <p className="font-medium">Billing Question</p>
            <p className="text-xs text-gray-500">1 month ago</p>
          </button>
        </div>
      </CollapsibleToolSection>
    </div>
  );
}


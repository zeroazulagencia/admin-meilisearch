'use client';

import { useState } from 'react';

const AgentTooltip = ({ description, children }: { description?: string | null; children: React.ReactNode }) => {
  if (!description) return <>{children}</>;
  return (
    <div className="group/tooltip relative inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-normal max-w-[220px] text-center z-50">
        {description}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
};

interface AgentAvatarProps {
  photo?: string | null;
  name: string;
  size?: number;
  description?: string | null;
}

export default function AgentAvatar({ photo, name, size = 14, description }: AgentAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const px = size * 4;
  const avatar = (
    <div
      className="shrink-0 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white"
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
    >
      {photo && !imgError ? (
        <img alt="" src={photo} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#5DE1E5] to-[#4BC5C9] flex items-center justify-center text-white font-bold" style={{ fontSize: px * 0.4 }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
  return <AgentTooltip description={description}>{avatar}</AgentTooltip>;
}
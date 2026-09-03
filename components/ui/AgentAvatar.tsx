'use client';

import { useState } from 'react';

interface AgentAvatarProps {
  photo?: string | null;
  name: string;
  size?: number;
  description?: string | null;
}

export default function AgentAvatar({ photo, name, size = 14 }: AgentAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const px = size * 4;
  return (
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
}
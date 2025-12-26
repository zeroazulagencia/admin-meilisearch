'use client';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  sending = false,
  placeholder = 'Escribe un mensaje...'
}: MessageInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !sending && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent resize-none text-sm"
          style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
          rows={2}
          disabled={disabled || sending}
        />
        <button
          onClick={onSend}
          disabled={disabled || sending || !value.trim()}
          className="px-6 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:opacity-90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
        >
          {sending ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-gray-900 border-t-transparent rounded-full"></div>
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Enviar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}


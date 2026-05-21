import React, { RefObject } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

interface ChatSidebarProps {
  isChatVisible: boolean;
  setIsChatVisible: (val: boolean) => void;
  isFullscreen: boolean;
  messages: { sender: string; text: string }[];
  username: string;
  chatInput: string;
  setChatInput: (val: string) => void;
  sendChatMessage: (e: React.FormEvent) => void;
  chatContainerRef: RefObject<HTMLDivElement | null>;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isChatVisible,
  setIsChatVisible,
  isFullscreen,
  messages,
  username,
  chatInput,
  setChatInput,
  sendChatMessage,
  chatContainerRef
}) => {
  if (!isChatVisible || isFullscreen) return null;

  return (
    <div className="w-80 flex flex-col shrink-0 transition-all theme-transition" style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
      <div className="h-14 flex items-center justify-between px-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <MessageSquare size={16} style={{ color: 'var(--fg-faint)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>Live Chat</h2>
        </div>
        <button 
          onClick={() => setIsChatVisible(false)}
          className="p-1 rounded-md transition-colors hover:opacity-80"
          style={{ color: 'var(--fg-faint)' }}
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-4">
             <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.sender === username ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] mb-1 px-1" style={{ color: 'var(--fg-faint)' }}>{msg.sender}</span>
              <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] ${msg.sender === username ? 'bg-indigo-600 text-white rounded-tr-sm' : msg.sender === 'System' ? 'w-full text-center italic rounded-xl' : 'rounded-tl-sm'}`}
                style={msg.sender === username ? {} : msg.sender === 'System' ? { background: 'var(--bg-card)', color: 'var(--fg-muted)', border: '1px solid var(--border)' } : { background: 'var(--bg-card)', color: 'var(--fg)' }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendChatMessage} className="p-4 theme-transition" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="relative">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full rounded-full py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:border-indigo-500 transition-colors theme-transition"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
          />
          <button 
            type="submit"
            disabled={!chatInput.trim()}
            aria-label="Send message"
            className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-50 transition-colors"
          >
            <Send size={14} className={chatInput.trim() ? "translate-x-[-1px] translate-y-[1px]" : ""} />
          </button>
        </div>
      </form>
    </div>
  );
};

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
    <div className="w-80 border-l border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0 transition-all">
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-zinc-400" />
          <h2 className="font-semibold text-sm">Live Chat</h2>
        </div>
        <button 
          onClick={() => setIsChatVisible(false)}
          className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-4">
             <p className="text-zinc-500 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.sender === username ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-zinc-500 mb-1 px-1">{msg.sender}</span>
              <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] ${msg.sender === username ? 'bg-indigo-600 text-white rounded-tr-sm' : msg.sender === 'System' ? 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 w-full text-center italic rounded-xl' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendChatMessage} className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="relative">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-full py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={!chatInput.trim()}
            className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-50 disabled:bg-zinc-800 transition-colors"
          >
            <Send size={14} className={chatInput.trim() ? "translate-x-[-1px] translate-y-[1px]" : ""} />
          </button>
        </div>
      </form>
    </div>
  );
};

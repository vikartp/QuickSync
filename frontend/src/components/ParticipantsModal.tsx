import React from 'react';
import { User, X } from 'lucide-react';

interface ParticipantsModalProps {
  showUsersModal: boolean;
  setShowUsersModal: (show: boolean) => void;
  activeUsers: string[];
  username: string;
}

export const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
  showUsersModal,
  setShowUsersModal,
  activeUsers,
  username
}) => {
  if (!showUsersModal) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="p-6 rounded-xl w-80 shadow-2xl theme-transition" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
         <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
             <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}><User size={18}/> Participants</h2>
             <button onClick={() => setShowUsersModal(false)} className="transition-colors hover:opacity-80" style={{ color: 'var(--fg-faint)' }}>
                 <X size={20} />
             </button>
         </div>
         
         <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
             {activeUsers.length === 0 ? (
                 <p className="text-sm text-center py-4" style={{ color: 'var(--fg-faint)' }}>No other users</p>
             ) : (
                 activeUsers.map((u, i) => (
                     <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                         <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                             {u.substring(0, 2)}
                         </div>
                         <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                             {u} {u === username && <span className="text-xs font-normal ml-1" style={{ color: 'var(--fg-faint)' }}>(You)</span>}
                         </span>
                     </div>
                 ))
             )}
         </div>
      </div>
    </div>
  );
};

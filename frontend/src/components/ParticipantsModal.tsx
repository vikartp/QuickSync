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
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-80 shadow-2xl">
         <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
             <h2 className="text-lg font-semibold flex items-center gap-2"><User size={18}/> Participants</h2>
             <button onClick={() => setShowUsersModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                 <X size={20} />
             </button>
         </div>
         
         <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
             {activeUsers.length === 0 ? (
                 <p className="text-sm text-zinc-500 text-center py-4">No other users</p>
             ) : (
                 activeUsers.map((u, i) => (
                     <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-950 border border-zinc-800/50">
                         <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                             {u.substring(0, 2)}
                         </div>
                         <span className="text-sm font-medium text-zinc-200">
                             {u} {u === username && <span className="text-zinc-500 text-xs font-normal ml-1">(You)</span>}
                         </span>
                     </div>
                 ))
             )}
         </div>
      </div>
    </div>
  );
};

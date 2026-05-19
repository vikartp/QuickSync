import React from 'react';
import { Settings, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  audioInputId: string;
  setAudioInputId: (val: string) => void;
  audioOutputId: string;
  setAudioOutputId: (val: string) => void;
  audioDevices: MediaDeviceInfo[];
  isAdmin: boolean;
  adminSessions: Record<string, string[]>;
  secretKey: string;
  fetchAdminSessions: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  showSettings,
  setShowSettings,
  audioInputId,
  setAudioInputId,
  audioOutputId,
  setAudioOutputId,
  audioDevices,
  isAdmin,
  adminSessions,
  secretKey,
  fetchAdminSessions
}) => {
  if (!showSettings) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="p-6 rounded-xl w-96 shadow-2xl theme-transition" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
         <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}><Settings size={20}/> Settings</h2>
         
         <div className="space-y-4">
             <div>
                 <label className="block text-sm mb-1" style={{ color: 'var(--fg-muted)' }}>Microphone</label>
                 <select 
                    value={audioInputId}
                    onChange={e => setAudioInputId(e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 theme-transition"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
                 >
                     <option value="">Default Microphone</option>
                     {audioDevices.filter(d => d.kind === 'audioinput').map(d => (
                         <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone (${d.deviceId.substring(0,5)})`}</option>
                     ))}
                 </select>
             </div>
             
             <div>
                 <label className="block text-sm mb-1" style={{ color: 'var(--fg-muted)' }}>Speaker (Output)</label>
                 <select 
                    value={audioOutputId}
                    onChange={e => setAudioOutputId(e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 theme-transition"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
                 >
                     <option value="">Default Speaker</option>
                     {audioDevices.filter(d => d.kind === 'audiooutput').map(d => (
                         <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker (${d.deviceId.substring(0,5)})`}</option>
                     ))}
                 </select>
             </div>
             
             {isAdmin && (
                 <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                     <div className="p-3 rounded max-h-48 overflow-y-auto" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}>
                         <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--fg-faint)' }}>Active Sessions (Admin)</h3>
                         {Object.keys(adminSessions).length === 0 ? (
                             <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>No active sessions</p>
                         ) : (
                             Object.entries(adminSessions).map(([ch, users]) => (
                                 <div key={ch} className="mb-2 last:mb-0 flex justify-between items-start">
                                     <div>
                                         <span className="text-indigo-400 text-sm font-medium">#{ch}</span>
                                         <div className="flex gap-1 flex-wrap mt-1">
                                             {users.map((u, i) => <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--fg)' }}>{u}</span>)}
                                         </div>
                                     </div>
                                     <button 
                                         onClick={async () => {
                                             try {
                                                 const baseUrl = process.env.NEXT_PUBLIC_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:8000';
                                                 await fetch(`${baseUrl}/admin/sessions/${ch}?admin_key=${encodeURIComponent(secretKey)}`, { method: 'DELETE' });
                                                 fetchAdminSessions();
                                             } catch (err) {
                                                 console.error(err);
                                             }
                                         }}
                                         className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"
                                         style={{ color: 'var(--fg-faint)' }}
                                         title="Delete Session"
                                     >
                                         <Trash2 size={14} />
                                     </button>
                                 </div>
                             ))
                         )}
                     </div>
                 </div>
             )}
         </div>
         
         <button onClick={() => setShowSettings(false)} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded font-medium transition-colors text-white">
            Done
         </button>
      </div>
    </div>
  );
};

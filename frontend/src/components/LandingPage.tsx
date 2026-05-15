import React, { useState } from 'react';
import { MonitorUp, User, Hash, KeyRound, Eye, EyeOff, Heart } from 'lucide-react';

interface LandingPageProps {
  username: string;
  setUsername: (val: string) => void;
  channel: string;
  setChannel: (val: string) => void;
  secretKey: string;
  setSecretKey: (val: string) => void;
  error: string;
  connectWebSocket: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  username,
  setUsername,
  channel,
  setChannel,
  secretKey,
  setSecretKey,
  error,
  connectWebSocket
}) => {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-zinc-100 selection:bg-indigo-500/30 font-sans relative overflow-hidden">
      {/* Fancy Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA0MCAwIEwgMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50 pointer-events-none"></div>

      <div className="w-full max-w-md pt-16 pb-10 px-10 rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative z-10">

        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30 ring-1 ring-white/10 transform transition-transform hover:scale-105 duration-300">
            <MonitorUp size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">QuickSync</h1>
          <p className="text-zinc-400 text-sm font-medium">Zero-latency P2P screen sharing & video calls.</p>
        </div>

        <div className="space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Username</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={18} className="text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                placeholder="Enter your name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Channel ID</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Hash size={18} className="text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                placeholder="e.g. daily-standup"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Secret Key</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound size={18} className="text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type={showSecret ? "text" : "password"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 pl-11 pr-12 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                placeholder="Required for access"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-indigo-400 transition-colors"
              >
                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            onClick={connectWebSocket}
            className="w-full mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Join Meeting</span>
            <MonitorUp size={18} />
          </button>
        </div>
      </div>

      {/* Footer Credit */}
      <div className="absolute bottom-6 w-full text-center z-10">
        <p className="text-sm text-zinc-500 font-medium tracking-wide flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
          Built by Vikash Kumar with <Heart size={14} className="fill-red-500 text-red-500 animate-pulse" /> in India
        </p>
      </div>
    </div>
  );
};

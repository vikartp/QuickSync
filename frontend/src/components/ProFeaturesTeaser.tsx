import React from 'react';
import { Check, Sparkles } from 'lucide-react';

export function ProFeaturesTeaser() {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
        {/* Background effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20">
              <Sparkles size={12} /> Coming Soon
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              QuickSync PRO
            </h2>
            <p className="text-sm mb-6 max-w-md mx-auto md:mx-0" style={{ color: 'var(--fg-muted)' }}>
              Elevate your team collaboration with powerful new features designed for scale and productivity.
            </p>
            <button className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-zinc-800 text-white hover:bg-zinc-700 transition-colors shadow-xl">
              Join the Waitlist
            </button>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {[
              "Up to 500 participants",
              "Chat retention",
              "Recurring schedules",
              "Email notifications",
              "AI Meeting summaries",
              "Full transcript downloads"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl backdrop-blur-sm bg-white/5 border border-white/5 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Check size={12} className="text-indigo-400" />
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--fg)' }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

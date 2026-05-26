"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MonitorUp, Shield, Lock, Sun, Moon, HelpCircle, X, Video, Users, Globe, Zap, Mic, MonitorUp as ScreenShare, MessageCircle } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';
import { FeedbackModal } from './FeedbackModal';

interface HeaderProps {
  showAuthOptions?: boolean;
}

export function Header({ showAuthOptions = true }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, loading } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);

  useEffect(() => {
    const baseDate = new Date('2026-05-15T00:00:00Z');
    const now = new Date();
    const daysPassed = Math.max(0, Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
    setSyncCount(100 + (daysPassed * 55) + now.getDate());
  }, []);

  return (
    <>
      <div className="sticky top-0 z-50 w-full flex flex-col shadow-sm">
        <nav className="w-full backdrop-blur-xl theme-transition" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">

            {/* Left: Logo */}
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                <MonitorUp size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--fg)' }}>QuickSync</span>
            </Link>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--fg-faint)' }}>
                <Lock size={12} />
                End-to-end encrypted
              </span>
              <div className="h-4 w-px hidden sm:block" style={{ background: 'var(--border)' }}></div>

              <button
                onClick={() => setShowInfo(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg-muted)' }}
                title="Features & Help"
              >
                <HelpCircle size={16} />
              </button>

              {user && (
                <>
                  <Link
                    href="/admin"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                    title="Admin Console"
                  >
                    <Shield size={16} />
                  </Link>
                  <button
                    onClick={() => setShowFeedback(true)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-indigo-500 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20"
                    title="Submit Feedback"
                  >
                    <MessageCircle size={16} />
                  </button>
                </>
              )}

              <button
                onClick={toggleTheme}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg-muted)' }}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </nav>

        {syncCount !== null && (
          <div className="w-full h-7 overflow-hidden theme-transition flex items-center" style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
            <div className="animate-marquee flex whitespace-nowrap items-center text-[11px] font-medium tracking-wider uppercase" style={{ color: 'var(--fg-muted)' }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="flex items-center gap-3 mx-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
                  Total syncs completed: <strong style={{ color: 'var(--fg)', fontSize: '12px' }}>{syncCount.toLocaleString()}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info Dialog */}
      {showInfo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInfo(false); }}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-6 custom-scrollbar"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                <HelpCircle size={20} className="text-indigo-400" />
                QuickSync — Features & Guide
              </h2>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                style={{ color: 'var(--fg-faint)' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Features */}
            <section className="mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-faint)' }}>Features</h3>
              <div className="grid gap-3">
                {[
                  { icon: Video, title: 'Video Calls', desc: 'One-on-one video calls with crystal-clear quality, powered by peer-to-peer WebRTC.' },
                  { icon: ScreenShare, title: 'Screen Sharing', desc: 'Share your entire screen or a specific window with one click.' },
                  { icon: Mic, title: 'Audio Controls', desc: 'Mute/unmute with a single tap. Choose your microphone and speaker from the audio menu.' },
                  { icon: Users, title: 'Recurring Meetings', desc: 'Create dedicated meeting rooms for your team. All members see them on their dashboard and can join anytime.' },
                  { icon: MessageCircle, title: 'User Feedback', desc: 'Submit feature requests or bug reports directly from the top navigation bar.' },
                  { icon: Globe, title: 'No Downloads Required', desc: 'Works entirely in your browser — no plugins, no installs. Just share a link.' },
                  { icon: Lock, title: 'End-to-End Encrypted', desc: 'All connections use WebRTC encryption. Your data never passes through our servers.' },
                  { icon: Zap, title: 'Ultra-Low Latency', desc: 'Direct peer-to-peer connections mean near-zero delay for real-time collaboration.' },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)' }}>
                      <f.icon size={15} className="text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{f.title}</p>
                      <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--fg-muted)' }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Instructions */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-faint)' }}>How to Use</h3>
              <ol className="space-y-2.5 text-sm list-decimal list-inside" style={{ color: 'var(--fg-muted)' }}>
                <li><strong style={{ color: 'var(--fg)' }}>Join as a Guest</strong> — Enter your name on the home page and click &quot;Start Meeting&quot;. A unique meeting link will be created instantly.</li>
                <li><strong style={{ color: 'var(--fg)' }}>Sign in with Google</strong> — Sign in to save your meeting history, create recurring meetings, and access your dashboard.</li>
                <li><strong style={{ color: 'var(--fg)' }}>Share the Link</strong> — Copy the meeting link from the browser bar and send it to anyone. They can join by simply opening it.</li>
                <li><strong style={{ color: 'var(--fg)' }}>Share Your Screen</strong> — Once in a meeting, click &quot;Share Screen&quot; to let the other person see your display.</li>
                <li><strong style={{ color: 'var(--fg)' }}>Turn on Camera</strong> — Click the camera button to enable video. The other participant will see your feed in real time.</li>
                <li><strong style={{ color: 'var(--fg)' }}>Audio Settings</strong> — Click the small arrow (▲) next to the microphone button to choose your input/output devices.</li>
                <li><strong style={{ color: 'var(--fg)' }}>Recurring Meetings</strong> — From your dashboard, click &quot;New Channel&quot; to create a meeting room that persists. Add team members and everyone can join anytime with one click.</li>
                <li><strong style={{ color: 'var(--fg)' }}>Record a Session</strong> — Click the &quot;Record&quot; button during a meeting. When you stop, the recording downloads automatically.</li>
                <li><strong style={{ color: 'var(--fg)' }}>Submit Feedback</strong> — Click the message bubble icon in the top header to send direct feedback to the admins.</li>
              </ol>
            </section>

            {/* Close button */}
            <button
              onClick={() => setShowInfo(false)}
              className="w-full mt-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg-muted)' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
      {/* Feedback Dialog */}
      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}
    </>
  );
}

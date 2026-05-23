"use client";

import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { MonitorUp, User, Heart, ArrowRight, Shield, Zap, Globe, Video, Users, Lock, Sun, Moon } from 'lucide-react';
import { loginWithGoogle, createMeeting } from '../../lib/api';
import { setToken } from '../../lib/auth';
import { useAuth } from '../../components/AuthProvider';
import { useTheme } from '../../components/ThemeProvider';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { ProFeaturesTeaser } from '../../components/ProFeaturesTeaser';
import { Testimonials } from '../../components/Testimonials';
import { FAQ } from '../../components/FAQ';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function AuthPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google login failed. Please try again.');
      return;
    }
    setIsLoading(true);
    try {
      const data = await loginWithGoogle(credentialResponse.credential);
      setToken(data.access_token);
      await refreshUser();
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestStart = async () => {
    if (!guestName.trim()) {
      setError('Please enter your name');
      return;
    }
    setIsLoading(true);
    try {
      const meeting = await createMeeting({ guest_name: guestName.trim() });
      router.push(`/meeting/${meeting.meeting_id}?name=${encodeURIComponent(guestName.trim())}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Zap, title: 'Zero Latency', desc: 'Direct peer-to-peer — no servers in between.' },
    { icon: Shield, title: 'End-to-End Encrypted', desc: 'WebRTC encryption built into every call.' },
    { icon: Globe, title: 'No Downloads', desc: 'Works directly in your browser, on any device.' },
    { icon: Users, title: 'Instant Sharing', desc: 'Generate a link and share — anyone can join.' },
  ];

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="h-screen flex flex-col relative overflow-hidden theme-transition" style={{ background: 'var(--bg)' }}>

        {/* Ambient Background Glows */}
        <div className="absolute top-[-30%] left-[-15%] w-[60%] h-[60%] rounded-full blur-[160px] pointer-events-none animate-pulse" style={{ background: 'var(--glow-1)', animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-30%] right-[-15%] w-[55%] h-[55%] rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ background: 'var(--glow-2)', animationDuration: '12s' }}></div>
        <div className="absolute top-[20%] right-[30%] w-[25%] h-[25%] rounded-full blur-[100px] pointer-events-none" style={{ background: 'var(--glow-3)' }}></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`, backgroundSize: '60px 60px' }}></div>

        {/* Sticky Navbar via Component */}
        <Header />

        {/* Main Content — Split Layout */}
        <main className="relative z-10 flex-1 overflow-y-auto w-full custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full px-6 py-4 lg:py-6 min-h-full flex items-center">
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center w-full">

              {/* Left — Hero */}
              <div className="order-2 lg:order-1">
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-3">
                <span className="whitespace-nowrap bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to bottom, var(--fg), var(--fg-muted))` }}>Seamless collaboration</span>
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">without the friction.</span>
              </h1>

              <p className="text-lg leading-relaxed mb-4 max-w-lg" style={{ color: 'var(--fg-muted)' }}>
                Crystal-clear video, ultra-low latency screen sharing, and dedicated team rooms. No downloads, no plugins—just share a link and connect.
              </p>

              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {features.map((f, i) => (
                  <div key={i} className="group flex items-start gap-3 p-3 rounded-xl transition-colors" style={{ ['--tw-bg-opacity' as string]: 0 }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all theme-transition" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <f.icon size={16} style={{ color: 'var(--fg-faint)' }} className="group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>{f.title}</h3>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-faint)' }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8">
                {[
                  { label: 'P2P', sub: 'Direct Connection' },
                  { label: '<50ms', sub: 'Avg. Latency' },
                  { label: 'E2EE', sub: 'Encrypted' },
                ].map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div className="h-8 w-px" style={{ background: 'var(--border)' }}></div>}
                    <div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{s.label}</div>
                      <div className="text-xs" style={{ color: 'var(--fg-faint)' }}>{s.sub}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Right — Auth Cards */}
            <div className="order-1 lg:order-2 w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">

              {/* Error */}
              {error && (
                <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                  {error}
                </div>
              )}

              {/* Google Sign In */}
              <div className="p-5 lg:p-6 rounded-3xl backdrop-blur-2xl theme-transition" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: `0 8px 40px var(--shadow)` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
                    <Video size={16} className="text-indigo-400" />
                  </div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Sign in to continue</h2>
                </div>
                <p className="text-sm mb-4 pl-11" style={{ color: 'var(--fg-faint)' }}>Create meetings, save history, and manage your dashboard.</p>
                
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google login failed')}
                    theme={theme === 'dark' ? 'filled_black' : 'outline'}
                    shape="pill"
                    size="large"
                    width="320"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 my-4 px-2">
                <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, var(--border), transparent)` }}></div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--fg-faint)' }}>or continue as guest</span>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, var(--border), transparent)` }}></div>
              </div>

              {/* Guest Access */}
              <div className="p-5 lg:p-6 rounded-3xl backdrop-blur-2xl theme-transition" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: `0 8px 40px var(--shadow)` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Zap size={16} className="text-emerald-400" />
                  </div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Instant Meeting</h2>
                </div>
                <p className="text-sm mb-4 pl-11" style={{ color: 'var(--fg-faint)' }}>No account needed. Start instantly and share the link.</p>
                
                <div className="space-y-3">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User size={16} style={{ color: 'var(--fg-ghost)' }} className="group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGuestStart()}
                      className="w-full rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none transition-all theme-transition"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
                      placeholder="Your display name"
                    />
                  </div>

                  <button
                    onClick={handleGuestStart}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    style={{ boxShadow: `0 0 24px var(--accent-glow)` }}
                  >
                    <span>{isLoading ? 'Creating...' : 'Start Meeting'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-5 mt-4 text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--fg-faint)' }}>
                <span className="flex items-center gap-1"><Shield size={10} /> Secure</span>
                <span className="flex items-center gap-1"><Zap size={10} /> Fast</span>
                <span className="flex items-center gap-1"><Globe size={10} /> No install</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* PRO Features Teaser */}
          <div className="max-w-7xl mx-auto w-full px-6 mt-8">
            <ProFeaturesTeaser />
          </div>

        {/* Testimonials */}
          <div className="max-w-7xl mx-auto w-full px-6 mt-8">
            <Testimonials />
          </div>

        {/* FAQ */}
          <div className="max-w-7xl mx-auto w-full px-6 pb-16">
            <FAQ />
          </div>
        </main>

        {/* Sticky Footer via Component */}
        <Footer />
      </div>
    </GoogleOAuthProvider>
  );
}

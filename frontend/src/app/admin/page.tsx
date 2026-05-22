"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Key, Loader2, Video, Users, Trash2, Globe, Lock, Activity, Clock, MonitorUp, User, ArrowLeft, Home } from 'lucide-react';
import { Footer } from '../../components/Footer';
import { useTheme } from '../../components/ThemeProvider';
import { Sun, Moon, MessageSquare } from 'lucide-react';
import { getApiUrl } from '../../lib/url';
import { getFeedbacks, deleteFeedback, Feedback } from '../../lib/api';

interface ActiveMeeting {
  meeting_id: string;
  title: string;
  is_guest_meeting: boolean;
  created_at: string;
  live_users: string[];
}

export default function AdminDashboard() {
  const { theme, toggleTheme } = useTheme();
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<ActiveMeeting[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const API_URL = getApiUrl();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/admin/sessions?admin_key=${encodeURIComponent(adminKey)}`);
      if (!res.ok) {
        throw new Error('Invalid secret key');
      }
      const data = await res.json();
      setSessions(data.sessions || []);

      try {
        const fbs = await getFeedbacks(adminKey);
        setFeedbacks(fbs || []);
      } catch (e) {
        console.error("Failed to fetch feedbacks", e);
      }

      setIsAuthenticated(true);
      // Save key to session storage to persist across reloads
      sessionStorage.setItem('admin_key', adminKey);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (key: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/sessions?admin_key=${encodeURIComponent(key)}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else if (res.status === 403) {
        // Key invalid, logout
        handleLogout();
        return;
      }

      try {
        const fbs = await getFeedbacks(key);
        setFeedbacks(fbs || []);
      } catch (e) {
        console.error("Failed to fetch feedbacks", e);
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  const handleEndMeeting = async (meetingId: string) => {
    if (!window.confirm("Are you sure you want to end this meeting? All users will be kicked.")) return;

    try {
      const res = await fetch(`${API_URL}/admin/sessions/${meetingId}?admin_key=${encodeURIComponent(adminKey)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions(sessions.filter(s => s.meeting_id !== meetingId));
      } else {
        alert("Failed to end meeting");
      }
    } catch (err) {
      console.error(err);
      alert("Error ending meeting");
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!window.confirm("Are you sure you want to delete this feedback?")) return;
    try {
      await deleteFeedback(feedbackId, adminKey);
      setFeedbacks(feedbacks.filter(fb => fb.id !== feedbackId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete feedback");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_key');
    setAdminKey('');
    setIsAuthenticated(false);
    setSessions([]);
    setFeedbacks([]);
  };

  // Check session storage on mount
  useEffect(() => {
    const savedKey = sessionStorage.getItem('admin_key');
    if (savedKey) {
      setAdminKey(savedKey);
      setLoading(true);
      fetchSessions(savedKey).then(() => {
        setIsAuthenticated(true);
        setLoading(false);
      });
    }
  }, []);

  // Poll for updates if authenticated
  useEffect(() => {
    if (isAuthenticated && adminKey) {
      const interval = setInterval(() => {
        fetchSessions(adminKey);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, adminKey]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans theme-transition" style={{ background: 'var(--bg)' }}>
        {/* Back to Home */}
        <div className="absolute top-6 left-6">
          <a href="/" className="flex items-center gap-2 text-sm font-medium transition-all hover:opacity-80" style={{ color: 'var(--fg-muted)' }}>
            <ArrowLeft size={16} />
            Home
          </a>
        </div>

        {/* Header with Theme Toggle */}
        <div className="absolute top-6 right-6 flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="w-full max-w-md p-8 rounded-3xl backdrop-blur-2xl theme-transition" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: `0 8px 40px var(--shadow)` }}>
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <Shield size={24} className="text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--fg)' }}>Admin Access</h1>
          <p className="text-center text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>Enter your administrative secret key to proceed.</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key size={18} style={{ color: 'var(--fg-ghost)' }} className="group-focus-within:text-red-500 transition-colors" />
              </div>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-all theme-transition"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
                placeholder="Admin Key"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard View
  const totalUsers = sessions.reduce((acc, curr) => acc + curr.live_users.length, 0);

  return (
    <div className="min-h-screen font-sans theme-transition flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Admin Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b theme-transition" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <MonitorUp size={16} className="text-white" />
            </div>
            <h1 className="font-semibold text-sm">QuickSync Admin</h1>
          </a>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg-muted)' }}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="/" className="flex items-center gap-1.5 text-sm font-medium hover:text-indigo-400 transition-colors" style={{ color: 'var(--fg-muted)' }}>
              <Home size={14} />
              Home
            </a>
            <button
              onClick={handleLogout}
              className="text-sm font-medium hover:text-red-400 transition-colors"
              style={{ color: 'var(--fg-muted)' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="p-6 rounded-2xl border theme-transition flex items-center gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <Video size={24} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-faint)' }}>Active Meetings</p>
              <h2 className="text-3xl font-bold">{sessions.length}</h2>
            </div>
          </div>

          <div className="p-6 rounded-2xl border theme-transition flex items-center gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Users size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-faint)' }}>Live Participants</p>
              <h2 className="text-3xl font-bold">{totalUsers}</h2>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity size={18} className="text-red-500" />
            Live Sessions
          </h2>
          <div className="text-xs flex items-center gap-1" style={{ color: 'var(--fg-faint)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Auto-updating
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border theme-transition" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <MonitorUp size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>No active meetings</h3>
            <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>The system is currently quiet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sessions.map(s => (
              <div key={s.meeting_id} className="p-5 rounded-2xl border flex flex-col md:flex-row gap-6 md:items-center justify-between theme-transition" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                {/* Meeting Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-base">{s.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: s.is_guest_meeting ? 'rgba(234, 179, 8, 0.1)' : 'rgba(99, 102, 241, 0.1)', color: s.is_guest_meeting ? '#eab308' : '#818cf8', border: `1px solid ${s.is_guest_meeting ? 'rgba(234, 179, 8, 0.2)' : 'rgba(99, 102, 241, 0.2)'}` }}>
                      {s.is_guest_meeting ? <Globe size={10} /> : <Lock size={10} />}
                      {s.is_guest_meeting ? 'Guest' : 'Member'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--fg-faint)' }}>
                    <span className="font-mono">ID: {s.meeting_id.slice(0, 8)}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(s.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Participants */}
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--fg-faint)' }}>
                    Participants ({s.live_users.length}/2)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {s.live_users.length === 0 ? (
                      <span className="text-xs italic" style={{ color: 'var(--fg-faint)' }}>Waiting for users...</span>
                    ) : (
                      s.live_users.map((user, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-input)', color: 'var(--fg)' }}>
                          <User size={12} style={{ color: 'var(--fg-ghost)' }} />
                          {user}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <button
                    onClick={() => handleEndMeeting(s.meeting_id)}
                    className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold transition-colors border border-red-500/20 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    End Meeting
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Feedbacks List */}
        <div className="mt-12 mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-500" />
            User Feedbacks
          </h2>
        </div>

        {feedbacks.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border theme-transition" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>No feedback yet</h3>
            <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>Users haven't submitted any feedback.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbacks.map(fb => (
              <div key={fb.id} className="p-5 rounded-2xl border theme-transition flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-bold text-xs">
                      {fb.user_email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{fb.user_email}</p>
                      <p className="text-[10px]" style={{ color: 'var(--fg-faint)' }}>{new Date(fb.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFeedback(fb.id)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete Feedback"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-3 rounded-xl text-sm leading-relaxed" style={{ background: 'var(--bg-input)', color: 'var(--fg-muted)' }}>
                  {fb.message}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Sticky Footer */}
      <Footer />
    </div>
  );
}

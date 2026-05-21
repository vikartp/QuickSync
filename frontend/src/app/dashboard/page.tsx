"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MonitorUp, Plus, LogOut, Video, Loader2, Sun, Moon, Shield, Users, Trash2 } from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';
import { useTheme } from '../../components/ThemeProvider';
import { MeetingCard } from '../../components/MeetingCard';
import { CreateChannelModal } from '../../components/CreateChannelModal';
import { createMeeting, getMyMeetings, endMeeting, deleteMeeting, getMyChannels, deleteChannel, Meeting, Channel } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [showChannelModal, setShowChannelModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) fetchMeetings();
  }, [user]);

  const fetchMeetings = async () => {
    try {
      const [meetingData, channelData] = await Promise.all([
        getMyMeetings().catch(() => ({ meetings: [] })),
        getMyChannels().catch(() => ({ channels: [] })),
      ]);
      setMeetings(meetingData.meetings);
      setChannels(channelData.channels);
    } catch (err) {
      console.error('Failed to fetch meetings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    setCreating(true);
    try {
      const meeting = await createMeeting({ title: title || undefined });
      setTitle('');
      router.push(`/meeting/${meeting.meeting_id}?name=${encodeURIComponent(user?.name || 'Host')}`);
    } catch (err) {
      console.error('Failed to create meeting', err);
    } finally {
      setCreating(false);
    }
  };

  const handleEndMeeting = async (meetingId: string) => {
    try {
      await endMeeting(meetingId);
      fetchMeetings();
    } catch (err) {
      console.error('Failed to end meeting', err);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId);
      setMeetings(prev => prev.filter(m => m.meeting_id !== meetingId));
    } catch (err) {
      console.error('Failed to delete meeting', err);
    }
  };

  const handleJoin = (meetingId: string) => {
    router.push(`/meeting/${meetingId}?name=${encodeURIComponent(user?.name || 'User')}`);
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await deleteChannel(channelId);
      setChannels(prev => prev.filter(c => c.channel_id !== channelId));
    } catch (err) {
      console.error('Failed to delete channel', err);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const activeMeetings = meetings.filter(m => m.status === 'active');
  const pastMeetings = meetings.filter(m => m.status === 'ended');

  return (
    <div className="min-h-screen font-sans theme-transition" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl theme-transition" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <MonitorUp size={16} className="text-white" />
            </div>
            <h1 className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>QuickSync</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.avatar_url && (
                <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" style={{ border: '1px solid var(--border)' }} />
              )}
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{user.name}</span>
            </div>
            <a
              href="/admin"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
              title="Admin Console"
            >
              <Shield size={16} />
            </a>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg-muted)' }}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg transition-colors hover:text-red-400"
              style={{ color: 'var(--fg-faint)' }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Create Meeting */}
        <div className="p-6 rounded-2xl backdrop-blur-xl mb-8 theme-transition" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: `0 4px 24px var(--shadow)` }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <Plus size={18} className="text-indigo-400" />
            New Meeting
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateMeeting()}
              className="flex-1 rounded-xl py-3 px-4 text-sm focus:outline-none transition-all theme-transition"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
              placeholder="Meeting title (optional)"
            />
            <button
              onClick={handleCreateMeeting}
              disabled={creating}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        {/* Active Meetings */}
        {activeMeetings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--fg-faint)' }}>
              Active Meetings ({activeMeetings.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMeetings.map(m => (
                <MeetingCard key={m.meeting_id} meeting={m} onJoin={handleJoin} onEnd={handleEndMeeting} />
              ))}
            </div>
          </section>
        )}

        {/* Recurring Meetings */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--fg-faint)' }}>
              <Users size={14} />
              Recurring Meetings {channels.length > 0 && `(${channels.length})`}
            </h2>
            <button
              onClick={() => setShowChannelModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95"
              style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent-glow)', color: 'var(--accent-hover)' }}
            >
              <Plus size={12} />
              New Channel
            </button>
          </div>

          {channels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.map(ch => (
                <div
                  key={ch.channel_id}
                  className="group p-5 rounded-2xl transition-all duration-200 theme-transition"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--accent-glow)',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users size={15} className="text-indigo-400 shrink-0" />
                      <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--fg)' }}>
                        {ch.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}
                      >
                        Recurring
                      </span>
                      {ch.created_by === user?.id && (
                        <button
                          onClick={() => handleDeleteChannel(ch.channel_id)}
                          className="p-1 rounded-lg transition-colors hover:bg-red-500/10 text-red-400/60 hover:text-red-400"
                          title="Delete channel"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Created by */}
                  <p className="text-xs mb-2" style={{ color: 'var(--fg-faint)' }}>
                    Created by {ch.created_by === user?.id ? 'you' : ch.created_by_name}
                  </p>

                  {/* Member avatars */}
                  <div className="flex items-center gap-1.5 mb-4">
                    {ch.members.slice(0, 5).map(m => (
                      m.avatar_url ? (
                        <img key={m.id} src={m.avatar_url} alt={m.name} title={m.name}
                          className="w-6 h-6 rounded-full border"
                          style={{ borderColor: 'var(--border)' }} />
                      ) : (
                        <div key={m.id} title={m.name}
                          className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300 border"
                          style={{ borderColor: 'var(--border)' }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      )
                    ))}
                    {ch.members.length > 5 && (
                      <span className="text-xs ml-1" style={{ color: 'var(--fg-faint)' }}>+{ch.members.length - 5}</span>
                    )}
                    <span className="text-xs ml-1" style={{ color: 'var(--fg-faint)' }}>
                      {ch.members.length} member{ch.members.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <button
                    onClick={() => router.push(`/meeting/${ch.channel_id}?name=${encodeURIComponent(user?.name || 'User')}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                  >
                    <Video size={14} />
                    Join
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !loading && (
              <div
                className="rounded-2xl p-8 text-center"
                style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)' }}
              >
                <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--fg-ghost)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>No recurring meetings yet</p>
                <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>
                  Create a channel to have a dedicated space with your team.
                </p>
              </div>
            )
          )}
        </section>

        {/* Past Meetings */}
        {pastMeetings.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--fg-faint)' }}>
              Past Meetings ({pastMeetings.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastMeetings.map(m => (
                <MeetingCard key={m.meeting_id} meeting={m} onJoin={handleJoin} onDelete={handleDeleteMeeting} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && meetings.length === 0 && channels.length === 0 && (
          <div className="text-center py-16">
            <Video size={48} className="mx-auto mb-4" style={{ color: 'var(--fg-ghost)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>No meetings yet</h3>
            <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>Create your first meeting or start a permanent channel!</p>
          </div>
        )}
      </main>

      {showChannelModal && (
        <CreateChannelModal
          onClose={() => setShowChannelModal(false)}
          onCreated={(ch) => {
            setChannels(prev => [ch, ...prev]);
            setShowChannelModal(false);
          }}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Plus, Users, Loader2, UserMinus } from 'lucide-react';
import { searchUsers, createChannel, User, Channel } from '../lib/api';

interface CreateChannelModalProps {
  onClose: () => void;
  onCreated: (channel: Channel) => void;
}

export function CreateChannelModal({ onClose, onCreated }: CreateChannelModalProps) {
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced user search
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const users = await searchUsers(q.trim());
      // Filter out already-selected members
      setSearchResults(users.filter(u => !selectedMembers.some(m => m.id === u.id)));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [selectedMembers]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const addMember = (user: User) => {
    setSelectedMembers(prev => [...prev, user]);
    setSearchResults(prev => prev.filter(u => u.id !== user.id));
    setQuery('');
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(u => u.id !== userId));
  };

  const handleCreate = async () => {
    if (!title.trim()) { setError('Please enter a channel name.'); return; }
    if (selectedMembers.length === 0) { setError('Add at least one member.'); return; }
    setError('');
    setCreating(true);
    try {
      const channel = await createChannel(title.trim(), selectedMembers.map(u => u.id));
      onCreated(channel);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <Users size={18} className="text-indigo-400" />
            New Recurring Meeting
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:opacity-70"
            style={{ color: 'var(--fg-faint)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Channel name */}
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>
            Channel Name
          </label>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setError(''); }}
            placeholder="e.g. Design Team"
            className="w-full rounded-xl py-2.5 px-4 text-sm focus:outline-none transition-all"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
            autoFocus
          />
        </div>

        {/* Member search */}
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>
            Add Members
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-faint)' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none transition-all"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
            />
            {searching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--fg-faint)' }} />
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div
              className="mt-1 rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
            >
              {searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => addMember(u)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:opacity-80"
                  style={{ background: 'transparent', color: 'var(--fg)' }}
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.name}</div>
                  </div>
                  <Plus size={14} className="ml-auto shrink-0 text-indigo-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected members */}
        {selectedMembers.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>
              Members ({selectedMembers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map(u => (
                <span
                  key={u.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent-glow)', color: 'var(--accent-hover)' }}
                >
                  {u.name}
                  <button onClick={() => removeMember(u.id)} className="hover:opacity-70 transition-opacity" aria-label={`Remove ${u.name}`}>
                    <UserMinus size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all theme-transition"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {creating ? 'Creating…' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}

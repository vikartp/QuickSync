"use client";

import React from 'react';
import { Meeting } from '../lib/api';
import { Video, Users, Clock, ExternalLink, Trash2, Timer } from 'lucide-react';

interface MeetingCardProps {
  meeting: Meeting;
  onJoin: (meetingId: string) => void;
  onEnd?: (meetingId: string) => void;
  onDelete?: (meetingId: string) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onJoin, onEnd, onDelete }) => {
  const isActive = meeting.status === 'active';
  const createdAt = new Date(meeting.created_at).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      className="group p-5 rounded-2xl transition-all duration-200 theme-transition"
      style={{
        background: isActive ? 'var(--bg-card)' : 'var(--bg-subtle)',
        border: `1px solid ${isActive ? 'var(--accent-glow)' : 'var(--border)'}`,
        boxShadow: isActive ? '0 4px 20px var(--accent-glow)' : 'none',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Video size={16} style={{ color: isActive ? 'var(--accent)' : 'var(--fg-faint)' }} />
          <h3 className="font-semibold text-sm truncate max-w-[200px]" style={{ color: 'var(--fg)' }}>
            {meeting.title || `Meeting ${meeting.meeting_id.slice(0, 8)}`}
          </h3>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            background: isActive ? 'rgba(34,197,94,0.1)' : 'var(--bg-input)',
            color: isActive ? '#4ade80' : 'var(--fg-faint)',
            border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
          }}
        >
          {isActive ? 'Active' : 'Ended'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs mb-4" style={{ color: 'var(--fg-faint)' }}>
        <span className="flex items-center gap-1"><Users size={12} />{meeting.participants_limit} max</span>
        <span className="flex items-center gap-1"><Clock size={12} />{createdAt}</span>
        {!isActive && meeting.duration_minutes != null && (
          <span className="flex items-center gap-1"><Timer size={12} />{meeting.duration_minutes < 60 ? `${meeting.duration_minutes} min` : `${Math.floor(meeting.duration_minutes / 60)}h ${meeting.duration_minutes % 60}m`}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isActive && (
          <>
            <button
              onClick={() => onJoin(meeting.meeting_id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              <ExternalLink size={14} />
              Join
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/meeting/${meeting.meeting_id}`)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors theme-transition"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg-muted)' }}
            >
              Copy Link
            </button>
          </>
        )}
        {isActive && onEnd && (
          <button
            onClick={() => onEnd(meeting.meeting_id)}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
            title="End Meeting"
          >
            <Trash2 size={14} />
          </button>
        )}
        {!isActive && onDelete && (
          <button
            onClick={() => onDelete(meeting.meeting_id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors border border-red-500/20"
            title="Delete from history"
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};


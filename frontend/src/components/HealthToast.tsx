"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { checkHealth } from '../lib/api';

type ToastStatus = 'checking' | 'online' | 'offline';

export function HealthToast() {
  const [status, setStatus] = useState<ToastStatus>('checking');
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Small delay so the toast doesn't flash before the page paint
    const delay = setTimeout(async () => {
      setVisible(true);
      try {
        await checkHealth();
        setStatus('online');
      } catch {
        setStatus('offline');
      }
    }, 600);

    return () => clearTimeout(delay);
  }, []);

  // Auto-dismiss the success toast after 4 s; keep error toast until user dismisses
  useEffect(() => {
    if (status === 'online') {
      const timer = setTimeout(() => setDismissed(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!visible || dismissed || status === 'checking') return null;

  const isOnline = status === 'online';

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl
                 animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{
        background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
        border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
        backdropFilter: 'blur(16px)',
        color: isOnline ? '#34d399' : '#f87171',
        minWidth: '280px',
        maxWidth: '420px',
      }}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <CheckCircle2 size={18} className="shrink-0" />
      ) : (
        <AlertTriangle size={18} className="shrink-0" />
      )}
      <span className="text-sm font-medium flex-1">
        {isOnline
          ? "You're all set — server is ready to go!"
          : 'Server is unreachable. Please check back in a few minutes.'}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-0.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

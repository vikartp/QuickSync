"use client";

import React from 'react';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="sticky bottom-0 z-50 backdrop-blur-xl theme-transition mt-auto shrink-0" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-0 sm:h-14 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-0">
        <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>
          &copy; {new Date().getFullYear()} QuickSync
        </p>
        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--fg-faint)' }}>
          Built by <span className="font-bold text-indigo-400">Vikash Kumar</span> with <Heart size={10} className="fill-red-500 text-red-500" /> in India
        </p>
      </div>
    </footer>
  );
}

"use client";

import React from 'react';
import Link from 'next/link';
import { MonitorUp, Shield, Lock, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface HeaderProps {
  showAuthOptions?: boolean;
}

export function Header({ showAuthOptions = true }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl theme-transition" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <MonitorUp size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--fg)' }}>QuickSync</span>
        </Link>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--fg-faint)' }}>
            <Lock size={12} />
            End-to-end encrypted
          </span>
          <div className="h-4 w-px hidden sm:block" style={{ background: 'var(--border)' }}></div>
          
          <Link
            href="/admin"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
            title="Admin Console"
          >
            <Shield size={16} />
          </Link>
          
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg-muted)' }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

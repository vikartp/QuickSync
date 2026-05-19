"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { Loader2 } from 'lucide-react';

/**
 * Root page — redirects based on auth state:
 * - Authenticated → /dashboard
 * - Not authenticated → /auth
 */
export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth');
      }
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );
}

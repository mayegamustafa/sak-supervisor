'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!appUser) {
      router.replace('/login');
    } else if (appUser.role === 'admin') {
      router.replace('/admin');
    } else {
      router.replace('/dashboard');
    }
  }, [appUser, loading, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-blue-700">
      <div className="text-center text-white">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full border-3 border-white/30 border-t-white animate-spin" />
        <p className="text-sm opacity-80">Loading…</p>
      </div>
    </div>
  );
}

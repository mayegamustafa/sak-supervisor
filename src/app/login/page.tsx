'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithEmail } from '@/lib/auth';
import { getUserProfile } from '@/lib/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { AcademicCapIcon } from '@/components/Icons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await loginWithEmail(email, password);
      const profile = await getUserProfile(cred.user.uid);
      if (!profile || !profile.active) {
        await auth.signOut();
        setError('Your account is not active. Contact your administrator.');
        return;
      }
      if (profile.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-blue-700 to-blue-800 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 sm:p-8 shadow-2xl">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
            <AcademicCapIcon className="h-9 w-9" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 leading-snug">
            Sir Apollo Kaggwa<br />
            <span className="text-blue-600">Schools Supervision</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {!isFirebaseConfigured && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-sm text-amber-800">
              Firebase is not configured. Copy <code>.env.local.example</code> to <code>.env.local</code> and fill in your Firebase credentials, then restart the dev server.
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

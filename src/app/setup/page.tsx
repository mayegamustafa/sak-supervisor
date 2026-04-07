'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/auth';
import { checkAdminExists } from '@/lib/firestore';
import { AcademicCapIcon } from '@/components/Icons';

type Step = 'checking' | 'form' | 'done' | 'blocked';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('checking');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Check if an admin already exists — if so block this page
  useEffect(() => {
    checkAdminExists()
      .then((exists) => setStep(exists ? 'blocked' : 'form'))
      .catch(() => setStep('form')); // on error, allow form (Firestore rules may allow first write)
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    try {
      await registerUser(email.trim(), password, name.trim(), 'admin');
      setStep('done');
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (step === 'checking') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-800 border-t-transparent" />
      </div>
    );
  }

  if (step === 'blocked') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AcademicCapIcon className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Setup Already Complete</h1>
          <p className="mt-2 text-sm text-gray-500">
            An admin account already exists. Please log in with your admin credentials.
          </p>
          <button
            onClick={() => router.replace('/login')}
            className="mt-6 w-full rounded-xl bg-red-800 py-3 font-semibold text-white"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <AcademicCapIcon className="h-7 w-7 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Admin Account Created!</h1>
          <p className="mt-2 text-sm text-gray-500">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-800 shadow-lg">
            <AcademicCapIcon className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">First-Time Setup</h1>
          <p className="mt-1 text-sm text-gray-500">Create the initial admin account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-red-800 py-3 font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Creating Admin…' : 'Create Admin Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          This page is only available when no admin account exists.
        </p>
      </div>
    </div>
  );
}

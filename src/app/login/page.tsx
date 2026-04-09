'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithEmail } from '@/lib/auth';
import { getUserProfile } from '@/lib/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { isBiometricAvailable, verifyBiometric, getCredentials, saveCredentials, hasStoredCredentials } from '@/lib/biometric';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [hasBiometric, setHasBiometric] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sak_remember');
      if (saved) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Check if biometric login is available
  useEffect(() => {
    async function check() {
      const { available, type } = await isBiometricAvailable();
      if (!available) return;
      setBiometricType(type);
      const stored = await hasStoredCredentials();
      setHasBiometric(stored);
    }
    check();
  }, []);

  async function navigateAfterLogin(uid: string) {
    const profile = await getUserProfile(uid);
    if (!profile || !profile.active) {
      await auth.signOut();
      setError('Your account is not active. Contact your administrator.');
      return false;
    }
    router.push(profile.role === 'admin' ? '/admin' : '/dashboard');
    return true;
  }

  async function handleBiometricLogin() {
    setBiometricLoading(true);
    setError('');
    try {
      const ok = await verifyBiometric();
      if (!ok) { setBiometricLoading(false); return; }

      const creds = await getCredentials();
      if (!creds) {
        setError('No saved credentials. Please sign in with email and password first.');
        setBiometricLoading(false);
        return;
      }

      const result = await loginWithEmail(creds.username, creds.password);
      await navigateAfterLogin(result.user.uid);
    } catch {
      setError('Biometric login failed. Please use email and password.');
    }
    setBiometricLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Save or clear remembered credentials
    if (rememberMe) {
      localStorage.setItem('sak_remember', JSON.stringify({ email, password }));
    } else {
      localStorage.removeItem('sak_remember');
    }

    try {
      const cred = await loginWithEmail(email, password);
      const success = await navigateAfterLogin(cred.user.uid);
      if (success) {
        // After successful login, offer biometric setup if available and not already set up
        const { available } = await isBiometricAvailable();
        if (available) {
          const stored = await hasStoredCredentials();
          if (!stored) {
            // Save credentials for biometric login — user can manage in profile
            await saveCredentials(email, password);
          }
        }
      } else {
        setLoading(false);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Login failed. Please try again.');
      }
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-red-800 via-red-900 to-red-950 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 sm:p-8 shadow-2xl">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-3">
            <Image src="/badges/sak.jpg" alt="SAK Badge" width={56} height={56} className="h-14 w-14 rounded-full object-cover shadow-md ring-2 ring-white" />
            <Image src="/badges/cps.png" alt="CPS Badge" width={56} height={56} className="h-14 w-14 rounded-full object-cover shadow-md ring-2 ring-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 leading-snug">
            SAK / CPS<br />
            <span className="text-red-800">Schools Supervision</span>
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-base focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                )}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-red-800 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-800 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-red-900 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Biometric Login */}
        {hasBiometric && biometricType && (
          <button
            onClick={handleBiometricLogin}
            disabled={biometricLoading}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-gray-50 py-4 text-base font-semibold text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-60"
          >
            {biometricLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-gray-800" />
            ) : (
              <svg className="h-5 w-5 text-red-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a48.667 48.667 0 0 0 1.758 11.673M11.25 4.652A7.497 7.497 0 0 0 4.755 10.5c0 3.07.547 6.012 1.548 8.736M12.75 19.348A7.497 7.497 0 0 0 19.245 10.5c0-3.07-.547-6.011-1.548-8.736M12 10.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            )}
            {biometricLoading ? 'Verifying…' : `Sign in with ${biometricType}`}
          </button>
        )}

        {/* Support Contact */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>Need help or have an error?</p>
          <a
            href="https://wa.me/256776003035"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-green-600 font-medium hover:underline"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            WhatsApp Mustafa: +256 776 003035
          </a>
        </div>
      </div>
    </div>
  );
}

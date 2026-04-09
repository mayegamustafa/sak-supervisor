'use client';

import { useState, useCallback } from 'react';
import { verifyBiometric } from '@/lib/biometric';

interface Props {
  onUnlock: () => void;
}

export default function BiometricLockScreen({ onUnlock }: Props) {
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleUnlock = useCallback(async () => {
    setVerifying(true);
    setError(false);
    const ok = await verifyBiometric();
    setVerifying(false);
    if (ok) {
      onUnlock();
    } else {
      setError(true);
    }
  }, [onUnlock]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-red-900 via-red-950 to-gray-950">
      <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/5 rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/5 rounded-full translate-y-12 -translate-x-12" />

      {/* Lock icon */}
      <div className="mb-6 rounded-full bg-white/10 p-6">
        <svg className="h-12 w-12 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-white mb-1">SAK Supervision</h1>
      <p className="text-sm text-white/60 mb-8">Tap to unlock with biometrics</p>

      <button
        onClick={handleUnlock}
        disabled={verifying}
        className="flex items-center gap-3 rounded-2xl bg-white/15 px-8 py-4 text-white font-semibold hover:bg-white/20 active:bg-white/25 transition-colors disabled:opacity-50"
      >
        {verifying ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a48.667 48.667 0 0 0 1.758 11.673M11.25 4.652A7.497 7.497 0 0 0 4.755 10.5c0 3.07.547 6.012 1.548 8.736M12.75 19.348A7.497 7.497 0 0 0 19.245 10.5c0-3.07-.547-6.011-1.548-8.736M12 10.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        )}
        {verifying ? 'Verifying…' : 'Unlock'}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-300">
          Verification failed. Please try again.
        </p>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl bg-blue-700 p-4 text-white shadow-2xl sm:left-auto sm:right-6 sm:w-80" style={{ bottom: 'calc(5rem + var(--safe-bottom))' }}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Install App</p>
          <p className="text-xs opacity-80 mt-0.5">
            Add SAK Supervision to your home screen for quick offline access.
          </p>
        </div>
        <button onClick={() => setShow(false)} className="text-white/60 text-lg leading-none">×</button>
      </div>
      <button
        onClick={handleInstall}
        className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-blue-700"
      >
        Install Now
      </button>
    </div>
  );
}

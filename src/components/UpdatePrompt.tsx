'use client';

import { useEffect, useState } from 'react';

interface VersionInfo {
  build: number;
  version: string;
  url: string;
}

/**
 * Shows an "Update available" banner inside the native app when the APK
 * published on the website (public/app-version.json) is newer than the
 * installed one. Users install the update OVER the current app — no
 * uninstall needed — as long as the APK is signed with the same key.
 *
 * Never renders on the web (the web app is always up to date).
 */
export default function UpdatePrompt() {
  const [latest, setLatest] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        // Builds older than the @capacitor/app plugin can't report their
        // version — treat them as build 1 (they all predate versioned CI).
        let current = 1;
        try {
          const { App } = await import('@capacitor/app');
          const info = await App.getInfo();
          current = parseInt(info.build, 10) || 1;
        } catch { /* old APK without the App plugin */ }

        const res = await fetch('/app-version.json', { cache: 'no-store' });
        if (!res.ok) return;
        const v: VersionInfo = await res.json();
        if (!cancelled && typeof v.build === 'number' && v.build > current) setLatest(v);
      } catch { /* web / offline — no banner */ }
    }

    check();
    // Re-check whenever the app returns to the foreground, so long-running
    // app sessions still learn about new versions without a full restart.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!latest || dismissed) return null;

  async function handleGetUpdate() {
    if (!latest) return;
    const url = new URL(latest.url, window.location.origin).toString();
    // Preferred: native share sheet → open in Chrome → download → install over.
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: 'SAK Supervision Update',
        text: `Open this link in your browser to download SAK Supervision v${latest.version}, then open the file to update (no need to uninstall):`,
        url,
      });
      return;
    } catch { /* Share plugin missing on old APKs */ }
    try {
      await navigator.share({ title: 'SAK Supervision Update', url });
      return;
    } catch { /* Web Share unavailable / cancelled */ }
    try {
      await navigator.clipboard.writeText(url);
      alert(`Update link copied!\n\nPaste it in Chrome to download v${latest.version}, then open the downloaded file to update. Your data is kept — no need to uninstall.`);
    } catch {
      alert(`To update, open this link in Chrome:\n${url}\n\nThen open the downloaded file to install the update.`);
    }
  }

  return (
    <div
      className="fixed left-0 right-0 z-[60] mx-auto max-w-2xl px-3 print:hidden"
      style={{ bottom: 'calc(4.5rem + var(--safe-bottom))' }}
    >
      <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 shadow-lg">
        <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-900">App update available (v{latest.version})</p>
          <p className="text-xs text-amber-700">Install over the current app — your data is kept.</p>
        </div>
        <button
          onClick={handleGetUpdate}
          className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white active:bg-amber-700"
        >
          Get update
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-amber-500 hover:bg-amber-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

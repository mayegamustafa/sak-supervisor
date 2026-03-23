'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getNotificationStatus, requestNotificationPermission } from '@/lib/messaging';
import { BellIcon } from './Icons';

/**
 * Persistent banner that prompts users to enable notifications.
 * Shows when:
 * - User is logged in
 * - Notification permission is not 'granted'
 * - User hasn't dismissed it in this session
 *
 * On native: guides user to app settings if denied.
 * On web: triggers the permission dialog.
 */
export default function NotificationPrompt() {
  const { appUser } = useAuth();
  const [status, setStatus] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!appUser) return;

    // Check on mount
    getNotificationStatus().then(setStatus);

    // Re-check when app comes back to foreground (user may have changed settings)
    function handleVisibility() {
      if (!document.hidden) {
        getNotificationStatus().then(setStatus);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [appUser]);

  // Don't show if granted, still loading, dismissed, or not logged in
  if (!appUser || status === null || status === 'granted' || dismissed) return null;

  async function handleEnable() {
    if (!appUser) return;
    setRequesting(true);
    const token = await requestNotificationPermission(appUser.id);
    const newStatus = await getNotificationStatus();
    setStatus(newStatus);
    setRequesting(false);

    if (token || newStatus === 'granted') {
      // Successfully enabled
      setStatus('granted');
    } else if (newStatus === 'denied') {
      // Was denied — on native, guide to settings
      const isNativeApp = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).Capacitor;
      if (isNativeApp) {
        try {
          const { NativeSettings } = await import('capacitor-native-settings' as string).catch(() => ({ NativeSettings: null }));
          if (NativeSettings) {
            NativeSettings.openAndroid({ option: 'application_details' });
          }
        } catch {
          alert('Please go to Settings → Apps → SAK Supervision → Notifications to enable push notifications.');
        }
      }
    }
  }

  return (
    <div className="fixed top-14 left-0 right-0 z-[90] px-3 pt-1">
      <div className="mx-auto max-w-2xl rounded-xl bg-blue-600 text-white p-3 shadow-lg flex items-center gap-3">
        <BellIcon className="h-6 w-6 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Enable Notifications</p>
          <p className="text-xs opacity-90">Get alerts for issues, messages & notices</p>
        </div>
        <button
          onClick={handleEnable}
          disabled={requesting}
          className="shrink-0 rounded-lg bg-white text-blue-600 px-3 py-1.5 text-xs font-bold hover:bg-blue-50 disabled:opacity-60"
        >
          {requesting ? 'Enabling…' : 'Enable'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-white/70 hover:text-white p-1"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

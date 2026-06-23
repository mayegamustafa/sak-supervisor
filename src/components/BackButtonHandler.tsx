'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Pages where pressing the hardware back button should leave the app
// (the user is already at a "root" screen).
const ROOT_PATHS = ['/dashboard', '/login', '/'];

/**
 * Makes the Android hardware / gesture back button navigate within the app
 * instead of immediately closing it:
 *   - if there is in-app history, go back one page;
 *   - otherwise, if not already on a root screen, go to the dashboard;
 *   - only exit the app when already at a root screen.
 *
 * No-op on the web / iOS (no Android back button) — there the browser/gesture
 * back already behaves correctly.
 */
export default function BackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let remove: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack && window.history.length > 1) {
            window.history.back();
          } else if (!ROOT_PATHS.includes(window.location.pathname)) {
            router.push('/dashboard');
          } else {
            App.exitApp();
          }
        });
        if (cancelled) {
          handle.remove();
        } else {
          remove = () => handle.remove();
        }
      } catch {
        // Not running inside Capacitor (web / plugin missing) — ignore.
      }
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
    // pathname is intentionally a dependency so the handler always sees the
    // latest route via window.location, and re-registers cleanly.
  }, [router, pathname]);

  return null;
}

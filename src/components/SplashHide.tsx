'use client';

import { useEffect } from 'react';

/**
 * Hides the Capacitor native splash screen once the web content has rendered.
 * On non-Capacitor environments (browser) this is a no-op.
 */
export default function SplashHide() {
  useEffect(() => {
    async function hide() {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch {
        // Not running in Capacitor — ignore
      }
    }
    hide();
  }, []);

  return null;
}

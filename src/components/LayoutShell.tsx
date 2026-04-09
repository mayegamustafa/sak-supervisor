'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from './Navbar';
import BottomNavigation from './BottomNavigation';
import PWAInstallPrompt from './PWAInstallPrompt';
import NotificationToast from './NotificationToast';
import NotificationPrompt from './NotificationPrompt';
import OfflineBanner from './OfflineBanner';
import BiometricLockScreen from './BiometricLockScreen';
import { isBiometricAvailable } from '@/lib/biometric';

const PUBLIC_PATHS = ['/login', '/setup'];
const NO_NAV_PATHS = ['/login', '/setup', '/report'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { appUser, loading } = useAuth();
  const [locked, setLocked] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);

  const isHome = pathname === '/';
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isNoNav = isHome || NO_NAV_PATHS.some((p) => pathname.startsWith(p));
  // Show nav when authenticated OR still loading on a non-public page (prevents flicker on navigation)
  const showNav = !isNoNav && (!!appUser || (loading && !isPublic));

  const shouldLock = !!appUser?.biometric_enabled && biometricReady;

  // Check biometric hardware availability once
  useEffect(() => {
    isBiometricAvailable().then(({ available }) => setBiometricReady(available));
  }, []);

  // Lock on app resume (visibility change) if biometric is enabled
  useEffect(() => {
    if (!shouldLock) return;

    function handleVisibility() {
      if (!document.hidden) {
        setLocked(true);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [shouldLock]);

  // Lock on first load if biometric is enabled
  useEffect(() => {
    if (shouldLock && !isPublic) {
      setLocked(true);
    }
  }, [shouldLock, isPublic]);

  const handleUnlock = useCallback(() => setLocked(false), []);

  return (
    <>
      {locked && <BiometricLockScreen onUnlock={handleUnlock} />}
      {showNav && <Navbar />}
      <main className={showNav ? 'mx-auto max-w-2xl px-4 sm:px-6 pt-22 pb-20' : ''}>
        {children}
      </main>
      {showNav && <BottomNavigation />}
      <PWAInstallPrompt />
      <NotificationToast />
      <NotificationPrompt />
      <OfflineBanner />
    </>
  );
}

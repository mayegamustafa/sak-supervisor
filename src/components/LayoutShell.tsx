'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from './Navbar';
import BottomNavigation from './BottomNavigation';
import PWAInstallPrompt from './PWAInstallPrompt';
import NotificationToast from './NotificationToast';
import NotificationPrompt from './NotificationPrompt';
import OfflineBanner from './OfflineBanner';
import PWASplashScreen from './PWASplashScreen';

const PUBLIC_PATHS = ['/login', '/setup'];
const NO_NAV_PATHS = ['/login', '/setup', '/report'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { appUser, loading } = useAuth();

  const isHome = pathname === '/';
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isNoNav = isHome || NO_NAV_PATHS.some((p) => pathname.startsWith(p));
  const showNav = !isNoNav && (!!appUser || (loading && !isPublic));

  return (
    <>
      {showNav && <Navbar />}
      <main className={showNav ? 'mx-auto max-w-2xl px-4 sm:px-6 pt-22 pb-20' : ''}>
        {children}
      </main>
      {showNav && <BottomNavigation />}
      <PWAInstallPrompt />
      <NotificationToast />
      <NotificationPrompt />
      <OfflineBanner />
      <PWASplashScreen />
    </>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from './Navbar';
import BottomNavigation from './BottomNavigation';
import PWAInstallPrompt from './PWAInstallPrompt';
import NotificationToast from './NotificationToast';

const PUBLIC_PATHS = ['/login', '/setup'];
const NO_NAV_PATHS = ['/login', '/setup', '/report'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isNoNav = NO_NAV_PATHS.some((p) => pathname.startsWith(p));
  const showNav = !isNoNav && !!appUser;

  return (
    <>
      {showNav && <Navbar />}
      <main className={`mx-auto max-w-2xl px-4 sm:px-6 ${showNav ? 'pt-18 pb-20' : ''}`}>
        {children}
      </main>
      {showNav && <BottomNavigation />}
      <PWAInstallPrompt />
      <NotificationToast />
    </>
  );
}

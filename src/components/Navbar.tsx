'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { ArrowRightOnRectangleIcon } from './Icons';

export default function Navbar() {
  const { appUser } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-blue-800 bg-blue-700 px-4 shadow-sm print:hidden" style={{ paddingTop: 'var(--safe-top)' }}>
      <Link href="/dashboard" className="text-base font-bold text-white leading-tight">
        <span className="block text-xs font-normal opacity-80">SAK SUPERVISION</span>
        Sir Apollo Kaggwa
      </Link>

      <div className="flex items-center gap-3">
        {appUser && (
          <span className="hidden text-xs text-blue-100 sm:block">
            {appUser.name}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900 active:bg-blue-950 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

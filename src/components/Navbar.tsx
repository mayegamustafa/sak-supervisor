'use client';

import Link from 'next/link';
import Image from 'next/image';
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
    <>
      <header className="navbar-gradient fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between px-4 shadow-lg print:hidden" style={{ paddingTop: 'var(--safe-top)' }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 text-white">
          <div className="flex -space-x-2">
            <Image src="/badges/sak.jpg" alt="SAK" width={36} height={36} className="h-9 w-9 rounded-full object-cover ring-2 ring-white/30 shadow-md" />
            <Image src="/badges/cps.png" alt="CPS" width={36} height={36} className="h-9 w-9 rounded-full object-cover ring-2 ring-white/30 shadow-md" />
          </div>
          <div className="leading-tight">
            <span className="block text-[10px] font-semibold tracking-widest uppercase text-amber-300/90">Supervision</span>
            <span className="text-sm font-bold tracking-wide">SAK / CPS</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {appUser && (
            <span className="hidden text-xs text-white/70 sm:block">
              {appUser.name}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 active:bg-white/5 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>
      {/* Curved bottom edge */}
      <div className="navbar-curve fixed top-16 left-0 right-0 z-39 h-4 print:hidden" style={{ marginTop: 'var(--safe-top)' }} />
    </>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { HomeIcon, BuildingIcon, PlusCircleIcon, BellIcon, Bars3Icon } from './Icons';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const morePath = appUser?.role === 'admin' ? '/admin/settings' : '/profile';

  const tabs = [
    { href: '/dashboard', label: 'Dashboard', Icon: HomeIcon },
    { href: '/schools', label: 'Schools', Icon: BuildingIcon },
    { href: '/issues/new', label: 'Add', Icon: PlusCircleIcon },
    { href: '/notices', label: 'Notices', Icon: BellIcon },
    { href: morePath, label: 'More', Icon: Bars3Icon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] print:hidden" style={{ paddingBottom: 'var(--safe-bottom)' }}>
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors active:scale-95 ${
                active ? 'text-red-800' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`h-6 w-6 ${active ? 'stroke-[2]' : ''}`} />
              <span>{label}</span>
              {active && (
                <span className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

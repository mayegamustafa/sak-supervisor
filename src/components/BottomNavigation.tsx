'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { HomeIcon, BuildingIcon, PlusCircleIcon, ChatBubbleIcon, Bars3Icon } from './Icons';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const morePath = appUser?.role === 'admin' ? '/admin/settings' : '/profile';

  const tabs = [
    { href: '/dashboard', label: 'Dashboard', Icon: HomeIcon },
    { href: '/schools', label: 'Schools', Icon: BuildingIcon },
    { href: '/issues/new', label: 'Add Issue', Icon: PlusCircleIcon },
    { href: '/chat', label: 'Chat', Icon: ChatBubbleIcon },
    { href: morePath, label: 'More', Icon: Bars3Icon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.06)] print:hidden" style={{ paddingBottom: 'var(--safe-bottom)' }}>
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors active:scale-95 ${
                active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`h-6 w-6 ${active ? 'stroke-[2]' : ''}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

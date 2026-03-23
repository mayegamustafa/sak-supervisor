'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logout } from '@/lib/auth';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  BuildingIcon,
  UsersIcon,
  CalendarIcon,
  CogIcon,
  ClipboardIcon,
  ChatBubbleIcon,
  DocumentTextIcon,
  ShareIcon,
  DownloadIcon,
} from '@/components/Icons';

export default function AdminSettingsPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
    if (!loading && appUser && appUser.role !== 'admin') router.replace('/profile');
  }, [loading, appUser, router]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  async function handleShareApp() {
    const shareData = {
      title: 'SAK Schools Supervision',
      text: 'Install the SAK Schools Supervision app to manage school supervisions and issues.',
      url: 'https://sak-supervisor.vercel.app',
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      alert('Link copied!');
    }
  }

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center"><div className="spinner" /></div>
  );

  return (
    <div className="space-y-6 py-2">
      {/* Profile Header */}
      <div className="-mx-4 sm:mx-0 flex flex-col items-center rounded-none sm:rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 py-6 text-white shadow-md">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
          <UserCircleIcon className="h-10 w-10" />
        </div>
        <h1 className="text-lg font-bold">{appUser.name}</h1>
        <p className="text-sm opacity-80">{appUser.email}</p>
        <span className="mt-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold capitalize">
          {appUser.role}
        </span>
      </div>

      {/* Admin Management */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Management</h2>
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          <SettingsLink icon={<BuildingIcon className="h-5 w-5" />} label="Admin Dashboard" desc="Stats, issues & visits overview" onClick={() => router.push('/admin')} />
          <SettingsLink icon={<UsersIcon className="h-5 w-5" />} label="Manage Users" desc="Add, disable, change roles" onClick={() => router.push('/admin/users')} />
          <SettingsLink icon={<CalendarIcon className="h-5 w-5" />} label="Term Settings" desc="Set term dates & weeks" onClick={() => router.push('/admin/terms')} />
          <SettingsLink icon={<DocumentTextIcon className="h-5 w-5" />} label="Print Report" desc="Generate issues report" onClick={() => router.push('/report')} />
        </div>
      </section>

      {/* Quick Access */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Quick Access</h2>
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          <SettingsLink icon={<ClipboardIcon className="h-5 w-5" />} label="Supervisions" desc="View all supervision logs" onClick={() => router.push('/visits')} />
          <SettingsLink icon={<ChatBubbleIcon className="h-5 w-5" />} label="Messages" desc="Chat with team members" onClick={() => router.push('/chat')} />
          <SettingsLink icon={<UserCircleIcon className="h-5 w-5" />} label="My Profile" desc="View your profile details" onClick={() => router.push('/profile')} />
        </div>
      </section>

      {/* Share App */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500 uppercase tracking-wider px-1">App</h2>
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          <SettingsLink icon={<ShareIcon className="h-5 w-5" />} label="Share App" desc="Invite others to install" onClick={handleShareApp} />
          <a href="/sak-supervision.apk" download className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><DownloadIcon className="h-5 w-5" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Download APK</p>
              <p className="text-xs text-gray-500">Android installation file</p>
            </div>
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </a>
        </div>
      </section>

      {/* Sign Out */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 py-4 text-base font-bold text-red-700 hover:bg-red-100"
      >
        <ArrowRightOnRectangleIcon className="h-5 w-5" />
        Sign Out
      </button>
    </div>
  );
}

function SettingsLink({ icon, label, desc, onClick }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
    </button>
  );
}

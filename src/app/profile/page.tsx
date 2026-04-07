'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logout } from '@/lib/auth';
import { updateUserProfile } from '@/lib/firestore';
import { uploadPhoto } from '@/lib/storage';
import { UserCircleIcon, ArrowRightOnRectangleIcon, BuildingIcon, ShareIcon, DownloadIcon, ClipboardIcon, ChatBubbleIcon, BellIcon, AppleIcon, AndroidIcon, DevicePhoneIcon } from '@/components/Icons';
import Image from 'next/image';

export default function ProfilePage() {
  const { appUser, loading, setAppUser } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  async function handleShareApp() {
    try {
      const res = await fetch('/sak-supervision.apk');
      const blob = await res.blob();
      const file = new File([blob], 'SAK-Supervision.apk', { type: 'application/vnd.android.package-archive' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'SAK Schools Supervision',
          text: 'Install the SAK Schools Supervision app for school supervision management.',
          files: [file],
        });
      } else {
        // Fallback: trigger download
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'SAK-Supervision.apk';
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      // Final fallback: direct download link
      window.open('/sak-supervision.apk', '_blank');
    }
  }

  async function handleShareiOS() {
    try {
      await navigator.share({
        title: 'SAK Schools Supervision (iOS)',
        text: 'Install the SAK Schools Supervision app on your iPhone via TestFlight.',
        url: 'https://testflight.apple.com/join/SAKSupervision',
      });
    } catch {
      await navigator.clipboard?.writeText('https://testflight.apple.com/join/SAKSupervision');
      alert('TestFlight link copied to clipboard!');
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !appUser) return;
    setUploading(true);
    try {
      const dataUrl = await uploadPhoto(file, `avatars/${appUser.id}`);
      await updateUserProfile(appUser.id, { photo_url: dataUrl });
      setAppUser((prev) => prev ? { ...prev, photo_url: dataUrl } : prev);
    } catch {
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Avatar / Name */}
      <div className="-mx-4 sm:mx-0 flex flex-col items-center rounded-none sm:rounded-2xl bg-gradient-to-br from-red-800 via-red-900 to-red-950 py-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full -translate-y-8 translate-x-8" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative mb-3 group"
        >
          <div className="h-24 w-24 rounded-full overflow-hidden ring-3 ring-white/30 shadow-lg">
            {appUser.photo_url ? (
              <Image src={appUser.photo_url} alt={appUser.name} width={96} height={96} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/20 text-white">
                <UserCircleIcon className="h-16 w-16" />
              </div>
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
        <p className="text-[10px] text-white/50 mb-2">Tap photo to change</p>
        <h1 className="text-xl font-bold">{appUser.name}</h1>
        <p className="mt-0.5 text-sm text-white/70">{appUser.email}</p>
        <span className="mt-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold capitalize">
          {appUser.role}
        </span>
      </div>

      {/* Info */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-4">
        <InfoRow label="Name" value={appUser.name} />
        <InfoRow label="Email" value={appUser.email} />
        <InfoRow label="Role" value={appUser.role.charAt(0).toUpperCase() + appUser.role.slice(1)} />
        <InfoRow label="Status" value={appUser.active ? 'Active' : 'Inactive'} />
      </div>

      {/* Admin quick link */}
      {appUser.role === 'admin' && (
        <button
          onClick={() => router.push('/admin/settings')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-base font-bold text-white"
        >
          <BuildingIcon className="h-5 w-5" />
          Admin Settings
        </button>
      )}

      {/* Quick Access */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm space-y-2">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Access</h3>
        <button onClick={() => router.push('/visits')} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left hover:bg-gray-50">
          <ClipboardIcon className="h-5 w-5 text-red-800" />
          <span className="text-sm font-medium text-gray-900">Supervisions</span>
        </button>
        <button onClick={() => router.push('/chat')} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left hover:bg-gray-50">
          <ChatBubbleIcon className="h-5 w-5 text-red-800" />
          <span className="text-sm font-medium text-gray-900">Messages</span>
        </button>
        <button onClick={() => router.push('/notices')} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left hover:bg-gray-50">
          <BellIcon className="h-5 w-5 text-red-800" />
          <span className="text-sm font-medium text-gray-900">Notices</span>
        </button>
      </div>

      {/* Share App */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-gray-900">Share App</h3>
        <p className="text-xs text-gray-500">Invite colleagues to install the SAK Supervision app.</p>

        {/* Android */}
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
          <AndroidIcon className="h-4 w-4" /> Android
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleShareApp}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-800 py-3 text-sm font-semibold text-white hover:bg-red-900"
          >
            <ShareIcon className="h-5 w-5" />
            Share APK
          </button>
          <a
            href="/sak-supervision.apk"
            download
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <DownloadIcon className="h-5 w-5" />
            Download APK
          </a>
        </div>

        {/* iOS */}
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1 pt-2">
          <AppleIcon className="h-4 w-4" /> iPhone / iPad
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleShareiOS}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <ShareIcon className="h-5 w-5" />
            Share iOS App
          </button>
          <a
            href="https://testflight.apple.com/join/SAKSupervision"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <DevicePhoneIcon className="h-5 w-5" />
            Get on iPhone
          </a>
        </div>
      </div>

      {/* Logout */}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

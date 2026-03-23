'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllNotices, deleteNotice } from '@/lib/firestore';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import PullIndicator from '@/components/PullIndicator';
import { BellIcon, PlusCircleIcon } from '@/components/Icons';
import type { Notice } from '@/types';

export default function NoticesPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    getAllNotices().then(setNotices).finally(() => setFetching(false));
  }, [appUser]);

  const handleRefresh = useCallback(async () => {
    setNotices(await getAllNotices());
  }, []);

  const { containerRef, pullDistance, refreshing } = usePullRefresh({ onRefresh: handleRefresh });

  async function handleDelete(id: string) {
    if (!confirm('Delete this notice?')) return;
    await deleteNotice(id);
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }

  function timeAgo(iso: string) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  if (loading || !appUser) return <div className="flex min-h-[60dvh] items-center justify-center"><div className="spinner" /></div>;

  return (
    <div ref={containerRef} className="space-y-4 py-2">
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BellIcon className="h-6 w-6 text-blue-600" />
          Notices
        </h1>
        <button
          onClick={() => router.push('/notices/new')}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
        >
          <PlusCircleIcon className="h-4 w-4" />
          Send Notice
        </button>
      </div>

      {fetching ? (
        <div className="flex min-h-[40dvh] items-center justify-center"><div className="spinner" /></div>
      ) : notices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <BellIcon className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">No notices yet</p>
          <p className="text-sm">Send a notice to all team members</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div key={notice.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">{notice.title}</h3>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{notice.body}</p>
                </div>
                {appUser.role === 'admin' && (
                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span className="font-medium text-gray-500">{notice.created_by_name}</span>
                <span>&middot;</span>
                <span>{timeAgo(notice.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

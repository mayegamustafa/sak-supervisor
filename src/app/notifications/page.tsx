'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/firestore';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import PullIndicator from '@/components/PullIndicator';
import { BellIcon } from '@/components/Icons';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    getUserNotifications(appUser.id).then((n) => {
      setNotifs(n);
      setFetching(false);
    });
  }, [appUser]);

  const handleRefresh = useCallback(async () => {
    if (!appUser) return;
    const n = await getUserNotifications(appUser.id);
    setNotifs(n);
  }, [appUser]);

  const { refreshing, pullDistance, containerRef } = usePullRefresh({ onRefresh: handleRefresh });

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function handleMarkAllRead() {
    if (!appUser) return;
    await markAllNotificationsRead(appUser.id);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div ref={containerRef} className="space-y-4">
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-red-800 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {fetching ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : notifs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <BellIcon className="mx-auto h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && handleMarkRead(n.id)}
              className={`w-full text-left rounded-xl border px-4 py-3 shadow-sm transition-colors ${
                n.read
                  ? 'bg-white border-gray-200'
                  : 'bg-red-50 border-red-200 hover:bg-red-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  n.read ? 'bg-gray-100' : 'bg-red-800'
                }`}>
                  <BellIcon className={`h-4 w-4 ${n.read ? 'text-gray-400' : 'text-white'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-red-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

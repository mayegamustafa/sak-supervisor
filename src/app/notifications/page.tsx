'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  related_id?: string;
}

function SwipeableNotifCard({
  n,
  onDismiss,
  onNavigate,
}: {
  n: Notification;
  onDismiss: (id: string) => void;
  onNavigate: (n: Notification) => void;
}) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const isDragging = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    currentX.current = e.clientX;
    isDragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return;
    currentX.current = e.clientX;
    const delta = currentX.current - startX.current;
    setOffsetX(delta);
  }

  function onPointerUp() {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = currentX.current - startX.current;
    if (Math.abs(delta) > 80) {
      setDismissed(true);
      setTimeout(() => onDismiss(n.id), 250);
    } else {
      setOffsetX(0);
    }
  }

  if (dismissed) return null;

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ transition: dismissed ? 'opacity 0.25s' : undefined, opacity: dismissed ? 0 : 1 }}
    >
      {/* Swipe hint background */}
      <div className="absolute inset-0 flex items-center justify-end pr-4 bg-red-100 rounded-xl">
        <span className="text-xs font-semibold text-red-700">Dismiss</span>
      </div>
      <div
        className={`relative border rounded-xl px-4 py-3 shadow-sm transition-colors cursor-pointer select-none ${
          n.read ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'
        }`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.2s ease',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => {
          if (Math.abs(offsetX) < 8) onNavigate(n);
        }}
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
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-gray-400">
                {new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              {n.related_id && (
                <span className="text-[10px] text-red-700 font-medium">Tap to view</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
    }).catch(() => setFetching(false));
  }, [appUser]);

  const handleRefresh = useCallback(async () => {
    if (!appUser) return;
    const n = await getUserNotifications(appUser.id);
    setNotifs(n);
  }, [appUser]);

  const { refreshing, pullDistance, containerRef } = usePullRefresh({ onRefresh: handleRefresh });

  async function handleDismiss(id: string) {
    if (!appUser) return;
    await markNotificationRead(id, appUser.id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleNavigate(n: Notification) {
    if (!appUser) return;
    if (!n.read) await markNotificationRead(n.id, appUser.id);
    setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.related_id) {
      router.push(`/issues/${n.related_id}`);
    }
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
        <div>
          <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
          <p className="text-xs text-gray-500 mt-0.5">Swipe left or right to dismiss</p>
        </div>
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
            <SwipeableNotifCard
              key={n.id}
              n={n}
              onDismiss={handleDismiss}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

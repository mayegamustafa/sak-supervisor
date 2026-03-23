'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUserChatRooms, getAllUsers, getOrCreateChatRoom } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import PullIndicator from '@/components/PullIndicator';
import type { ChatRoom, AppUser } from '@/types';

export default function ChatListPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  const fetchData = useCallback(async () => {
    if (!appUser) return;
    const [r, u] = await Promise.all([getUserChatRooms(appUser.id), getAllUsers()]);
    setRooms(r);
    setUsers(u.filter((u) => u.id !== appUser.id));
    setFetching(false);
  }, [appUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { refreshing, pullDistance, containerRef } = usePullRefresh({ onRefresh: fetchData });

  async function startChat(other: AppUser) {
    if (!appUser || starting) return;
    setStarting(other.id);
    try {
      const roomId = await getOrCreateChatRoom(appUser.id, appUser.name, other.id, other.name);
      router.push(`/chat/${roomId}`);
    } finally {
      setStarting(null);
    }
  }

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center"><div className="spinner" /></div>
  );

  function getOtherName(room: ChatRoom) {
    const otherId = room.participants.find((p) => p !== appUser!.id);
    return otherId ? (room.participant_names?.[otherId] ?? 'Unknown') : 'Unknown';
  }

  function getOtherUser(room: ChatRoom) {
    const otherId = room.participants.find((p) => p !== appUser!.id);
    return users.find((u) => u.id === otherId);
  }

  function timeAgo(iso: string) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  return (
    <div ref={containerRef} className="space-y-4">
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Messages</h1>
        <button
          onClick={() => setShowUsers(!showUsers)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          {showUsers ? 'Back to Chats' : 'New Chat'}
        </button>
      </div>

      {showUsers ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Select a user to start a conversation</p>
          {users.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No other users found.</p>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => startChat(u)}
                disabled={starting === u.id}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {u.name.charAt(0).toUpperCase()}
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${u.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.role} {u.online ? '· Online' : ''}</p>
                </div>
                {starting === u.id && <div className="spinner h-4 w-4" />}
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {fetching ? (
            <div className="flex py-12 justify-center"><div className="spinner" /></div>
          ) : rooms.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No conversations yet.</p>
              <button onClick={() => setShowUsers(true)} className="mt-2 text-sm font-medium text-blue-600">
                Start a new chat →
              </button>
            </div>
          ) : (
            rooms.map((room) => {
              const otherUser = getOtherUser(room);
              return (
                <button
                  key={room.id}
                  onClick={() => router.push(`/chat/${room.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {getOtherName(room).charAt(0).toUpperCase()}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${otherUser?.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 truncate">{getOtherName(room)}</p>
                      <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">{timeAgo(room.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{room.last_message || 'No messages yet'}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

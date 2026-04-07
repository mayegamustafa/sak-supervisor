'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onMessages, sendMessage, createNotification } from '@/lib/firestore';
import { sendPush } from '@/lib/messaging';
import { useAuth } from '@/context/AuthContext';
import type { ChatMessage } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ChatRoomPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState('Chat');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  // Get other participant name
  useEffect(() => {
    if (!appUser || !chatId) return;
    getDoc(doc(db, 'chat_rooms', chatId)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const otherId = d.participants?.find((p: string) => p !== appUser.id);
      if (otherId && d.participant_names?.[otherId]) {
        setOtherName(d.participant_names[otherId]);
      }
    });
  }, [appUser, chatId]);

  // Real-time message listener
  useEffect(() => {
    if (!chatId) return;
    const unsub = onMessages(chatId, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [chatId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser || !text.trim() || sending) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    try {
      await sendMessage(chatId, appUser.id, appUser.name, msg);
      // Notify the other participant
      const snap = await getDoc(doc(db, 'chat_rooms', chatId));
      if (snap.exists()) {
        const d = snap.data();
        const otherId = d.participants?.find((p: string) => p !== appUser.id);
        if (otherId) {
          const preview = msg.length > 80 ? msg.slice(0, 80) + '…' : msg;
          const notifTitle = `${appUser.name} sent you a message`;
          const notifBody = `${preview}\n\nTap to reply`;
          await createNotification({
            type: 'chat',
            title: notifTitle,
            body: notifBody,
            target_user_id: otherId,
            created_by: appUser.id,
          });
          sendPush({ title: notifTitle, body: notifBody, target_user_id: otherId });
        }
      }
    } finally {
      setSending(false);
    }
  }

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center"><div className="spinner" /></div>
  );

  function formatTime(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 8rem)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-3 mb-3">
        <button onClick={() => router.push('/chat')} className="text-red-800 text-sm font-medium">
          ← Back
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-900">
          {otherName.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-base font-bold text-gray-900 truncate">{otherName}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-2">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === appUser.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                isMine
                  ? 'bg-red-800 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              }`}>
                {!isMine && (
                  <p className="text-[10px] font-semibold text-red-800 mb-0.5">{msg.sender_name}</p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-red-200' : 'text-gray-400'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-200 pt-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="rounded-xl bg-red-800 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

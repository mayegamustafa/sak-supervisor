'use client';

import { useEffect, useState } from 'react';
import { onForegroundMessage } from '@/lib/messaging';

interface Toast {
  id: number;
  title: string;
  body: string;
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = onForegroundMessage(({ title, body }) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, title, body }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 left-4 sm:left-auto sm:w-80 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-xl bg-white border border-gray-200 p-4 shadow-lg animate-in fade-in slide-in-from-top"
          onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
        >
          <p className="text-sm font-semibold text-gray-900">{t.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t.body}</p>
        </div>
      ))}
    </div>
  );
}

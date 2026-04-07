'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createNotice, createNotification } from '@/lib/firestore';
import { sendPush } from '@/lib/messaging';
import { MegaphoneIcon } from '@/components/Icons';

export default function NewNoticePage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading || !appUser) {
    return <div className="flex min-h-[60dvh] items-center justify-center"><div className="spinner" /></div>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser || !title.trim() || !body.trim()) return;
    setSubmitting(true);

    try {
      // Save notice to Firestore
      await createNotice({
        title: title.trim(),
        body: body.trim(),
        created_by: appUser.id,
        created_by_name: appUser.name,
      });

      // Create in-app notification
      await createNotification({
        type: 'system',
        title: title.trim(),
        body: body.trim(),
        target_all: true,
        created_by: appUser.id,
      });

      // Send push notification to all devices
      await sendPush({
        title: title.trim(),
        body: body.trim(),
        target_all: true,
      });

      router.replace('/notices');
    } catch (err) {
      console.error('Failed to send notice:', err);
      alert('Failed to send notice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="py-2">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-xl p-2 hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MegaphoneIcon className="h-6 w-6 text-red-800" />
          Send Notice
        </h1>
      </div>

      <div className="rounded-2xl border border-red-100 bg-red-50 p-3 mb-6">
        <p className="text-sm text-red-900">
          This notice will be sent to <strong>all users</strong> as both an in-app notification and a push notification on their devices.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Staff Meeting Tomorrow"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            required
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your notice message here..."
            rows={5}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            required
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-400 text-right">{body.length}/500</p>
        </div>

        <button
          type="submit"
          disabled={submitting || !title.trim() || !body.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-800 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-red-900 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <div className="spinner h-5 w-5 border-white" />
              Sending...
            </>
          ) : (
            <>
              <MegaphoneIcon className="h-5 w-5" />
              Send to All Users
            </>
          )}
        </button>
      </form>
    </div>
  );
}

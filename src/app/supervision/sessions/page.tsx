'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getUserSupervisionSessions, getAllSupervisionSessions, deleteSupervisionSession } from '@/lib/firestore-supervision';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import PullIndicator from '@/components/PullIndicator';
import type { SupervisionSession } from '@/types';

function scoreColor(score: number) {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 50) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

function SessionsInner() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showAll = searchParams.get('all') === '1';

  const [sessions, setSessions] = useState<SupervisionSession[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewAll, setViewAll] = useState(showAll);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  const loadSessions = useCallback(async () => {
    if (!appUser) return;
    const data = viewAll
      ? await getAllSupervisionSessions()
      : await getUserSupervisionSessions(appUser.id);
    setSessions(data);
  }, [appUser, viewAll]);

  useEffect(() => {
    if (!appUser) return;
    setFetching(true);
    loadSessions().finally(() => setFetching(false));
  }, [appUser, loadSessions]);

  const handleRefresh = useCallback(async () => {
    await loadSessions();
  }, [loadSessions]);

  const { refreshing, pullDistance, containerRef } = usePullRefresh({ onRefresh: handleRefresh });

  async function handleDelete(session: SupervisionSession) {
    if (!confirm(`Delete this assessment for ${session.school_name}?`)) return;
    setDeleting(session.id);
    try {
      await deleteSupervisionSession(session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch {
      alert('Failed to delete session.');
    } finally {
      setDeleting(null);
    }
  }

  if (loading || !appUser)
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="spinner" />
      </div>
    );

  return (
    <div ref={containerRef} className="space-y-4">
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/supervision')} className="rounded-lg bg-gray-100 p-2 text-gray-600 active:bg-gray-200">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">
            {viewAll ? 'All Sessions' : 'My Sessions'}
          </h1>
        </div>
        <button
          onClick={() => setViewAll((v) => !v)}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-50"
        >
          {viewAll ? 'Show Mine' : 'Show All'}
        </button>
      </div>

      {/* Sessions */}
      {fetching ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-12 text-center">
          <p className="text-sm font-medium text-gray-500">No assessment sessions found</p>
          <Link href="/supervision" className="mt-2 inline-block text-sm font-semibold text-red-800">
            Start an assessment →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const canDelete = session.supervisor_id === appUser.id || appUser.role === 'admin';
            return (
              <div key={session.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{session.school_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{session.tool_name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-400">{session.department}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">
                        {new Date(session.session_date).toLocaleDateString()}
                      </span>
                      {viewAll && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{session.supervisor_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreColor(session.total_score)}`}>
                    {session.total_score}/100
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/supervision/sessions/${session.id}`}
                    className="flex-1 rounded-lg bg-red-800 px-3 py-2 text-center text-sm font-semibold text-white active:bg-red-900"
                  >
                    View Report
                  </Link>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(session)}
                      disabled={deleting === session.id}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 active:bg-red-100 disabled:opacity-50"
                    >
                      {deleting === session.id ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60dvh] items-center justify-center"><div className="spinner" /></div>}>
      <SessionsInner />
    </Suspense>
  );
}

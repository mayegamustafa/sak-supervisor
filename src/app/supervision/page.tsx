'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getAllSupervisionTools, deleteSupervisionTool } from '@/lib/firestore-supervision';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import PullIndicator from '@/components/PullIndicator';
import type { SupervisionTool } from '@/types';

const DEPT_COLORS: Record<string, string> = {
  Finance: 'bg-emerald-100 text-emerald-800',
  Academic: 'bg-blue-100 text-blue-800',
  'Quality Assurance': 'bg-purple-100 text-purple-800',
  Theology: 'bg-orange-100 text-orange-800',
  TDP: 'bg-cyan-100 text-cyan-800',
};

function getDeptColor(dept: string) {
  return DEPT_COLORS[dept] ?? 'bg-gray-100 text-gray-800';
}

export default function SupervisionPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [tools, setTools] = useState<SupervisionTool[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    getAllSupervisionTools()
      .then(setTools)
      .finally(() => setFetching(false));
  }, [appUser]);

  const handleRefresh = useCallback(async () => {
    const t = await getAllSupervisionTools();
    setTools(t);
  }, []);

  const { refreshing, pullDistance, containerRef } = usePullRefresh({ onRefresh: handleRefresh });

  async function handleDelete(tool: SupervisionTool) {
    if (!confirm(`Delete "${tool.name}"? This cannot be undone.`)) return;
    setDeleting(tool.id);
    try {
      await deleteSupervisionTool(tool.id);
      setTools((prev) => prev.filter((t) => t.id !== tool.id));
    } catch {
      alert('Failed to delete tool.');
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
    <div ref={containerRef} className="space-y-5">
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Supervision Tools</h1>
          <p className="text-sm text-gray-500">Routine supervision assessment tools</p>
        </div>
        <Link
          href="/supervision/tools/new"
          className="rounded-full bg-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-sm active:bg-gray-900"
        >
          + New Tool
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/supervision/sessions"
          className="card-press flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">My Sessions</p>
            <p className="text-xs text-gray-500">View assessments</p>
          </div>
        </Link>
        <Link
          href="/supervision/sessions?all=1"
          className="card-press flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <svg className="h-5 w-5 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">All Sessions</p>
            <p className="text-xs text-gray-500">Browse all reports</p>
          </div>
        </Link>
      </div>

      {/* Tools List */}
      {fetching ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner" />
        </div>
      ) : tools.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-500">No supervision tools yet</p>
          <p className="mt-1 text-xs text-gray-400">Create a tool to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => {
            const isOwner = tool.created_by_id === appUser.id;
            const isAdmin = appUser.role === 'admin';
            const canManage = isOwner || isAdmin;
            return (
              <div
                key={tool.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{tool.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getDeptColor(tool.department)}`}>
                        {tool.department}
                      </span>
                      <span className="text-xs text-gray-400">
                        {tool.areas.length} area{tool.areas.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">by {tool.created_by}</span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                    /100
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/supervision/assess/${tool.id}`}
                    className="flex-1 rounded-lg bg-gray-800 px-3 py-2 text-center text-sm font-semibold text-white active:bg-gray-900"
                  >
                    Start Assessment
                  </Link>
                  <Link
                    href={`/supervision/tools/${tool.id}/print`}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 active:bg-gray-50"
                    title="Print blank form for hardcopy"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </Link>
                  {canManage && (
                    <>
                      <Link
                        href={`/supervision/tools/${tool.id}/edit`}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 active:bg-gray-50"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(tool)}
                        disabled={deleting === tool.id}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 active:bg-red-100 disabled:opacity-50"
                      >
                        {deleting === tool.id ? '…' : 'Delete'}
                      </button>
                    </>
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

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllIssues } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import PullIndicator from '@/components/PullIndicator';
import IssueCard from '@/components/IssueCard';
import type { Issue, IssueStatus } from '@/types';

const FILTERS: { label: string; value: IssueStatus | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Pending', value: 'Pending' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
];

export default function StrengthsPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState<IssueStatus | 'All'>('All');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    getAllIssues().then((i) => {
      setAllIssues(i.filter((item) => item.submission_type === 'strength'));
      setFetching(false);
    });
  }, [appUser]);

  const handleRefresh = useCallback(async () => {
    const i = await getAllIssues();
    setAllIssues(i.filter((item) => item.submission_type === 'strength'));
  }, []);

  const { refreshing, pullDistance, containerRef } = usePullRefresh({ onRefresh: handleRefresh });

  const filtered = filter === 'All' ? allIssues : allIssues.filter((i) => i.status === filter);

  // Group by school
  const bySchool: Record<string, Issue[]> = {};
  filtered.forEach((i) => {
    if (!bySchool[i.school_name]) bySchool[i.school_name] = [];
    bySchool[i.school_name].push(i);
  });

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  return (
    <div ref={containerRef} className="space-y-4">
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Strengths & Achievements</h1>
          <p className="text-xs text-gray-500 mt-0.5">Positive findings across all schools</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/report')}
            className="rounded-full border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600"
          >
            Report
          </button>
          <button
            onClick={() => router.push('/issues/new')}
            className="rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors active:scale-95 ${
              filter === value
                ? 'bg-green-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {fetching ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No strengths recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(bySchool)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([school, schoolItems]) => (
              <div key={school}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{school}</span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                    {schoolItems.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {schoolItems.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

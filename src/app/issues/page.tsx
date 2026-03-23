'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllIssues } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import IssueCard from '@/components/IssueCard';
import type { Issue, IssueStatus } from '@/types';

const FILTERS: { label: string; value: IssueStatus | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Pending', value: 'Pending' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
];

export default function IssuesPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState<IssueStatus | 'All'>('All');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    getAllIssues().then((i) => { setIssues(i); setFetching(false); });
  }, [appUser]);

  const filtered = filter === 'All' ? issues : issues.filter((i) => i.status === filter);

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Issues</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/report')}
            className="rounded-full border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600"
          >
            Print Report
          </button>
          <button
            onClick={() => router.push('/issues/new')}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            + Report
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors active:scale-95 ${
              filter === value
                ? 'bg-blue-600 text-white shadow-sm'
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
        <p className="py-8 text-center text-sm text-gray-400">No issues found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
        </div>
      )}
    </div>
  );
}

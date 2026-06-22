'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAllIssues } from '@/lib/firestore';
import { normalizeCategory } from '@/lib/categories';
import { useAuth } from '@/context/AuthContext';
import IssueCard from '@/components/IssueCard';
import type { Issue, IssueStatus } from '@/types';

const FILTERS: { label: string; value: IssueStatus | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Pending', value: 'Pending' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
];

export default function DepartmentDetailPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const { name } = useParams<{ name: string }>();
  const department = decodeURIComponent(name ?? '');

  const [issues, setIssues] = useState<Issue[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<IssueStatus | 'All'>('All');

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!department || !appUser) return;
    getAllIssues()
      .then((all) => setIssues(all.filter((i) => normalizeCategory(i.category) === department)))
      .catch((e) => { console.error(e); setIssues([]); })
      .finally(() => setFetching(false));
  }, [department, appUser]);

  if (loading || fetching || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-red-800 font-medium">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Back
      </button>

      <div className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl bg-gradient-to-br from-red-800 via-red-900 to-red-950 p-5 text-white shadow-md">
        <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Department</p>
        <h1 className="text-xl font-bold">{department}</h1>
      </div>

      {/* Status Summary */}
      {issues.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
            <p className="text-xl font-bold text-red-700">{issues.filter(i => i.status === 'Pending').length}</p>
            <p className="text-xs text-red-600 font-medium">Pending</p>
          </div>
          <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-3 text-center">
            <p className="text-xl font-bold text-yellow-700">{issues.filter(i => i.status === 'In Progress').length}</p>
            <p className="text-xs text-yellow-600 font-medium">In Progress</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-center">
            <p className="text-xl font-bold text-green-700">{issues.filter(i => i.status === 'Resolved').length}</p>
            <p className="text-xs text-green-600 font-medium">Resolved</p>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold text-gray-900">Reports ({issues.length})</h2>

        {issues.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none mb-3">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === value
                    ? 'bg-red-800 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {issues.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No reports in this department.</p>
        ) : (
          <div className="space-y-3">
            {(filter === 'All' ? issues : issues.filter(i => i.status === filter))
              .map((issue) => <IssueCard key={issue.id} issue={issue} />)}
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllIssues, getSupervisorVisits, getAllTermConfigs, getActiveTerm, deleteVisitLog } from '@/lib/firestore';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import PullIndicator from '@/components/PullIndicator';
import IssueCard from '@/components/IssueCard';
import { ExclamationTriangleIcon, TrophyIcon } from '@/components/Icons';
import type { Issue, VisitLog, TermConfig } from '@/types';

export default function DashboardPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [terms, setTerms] = useState<TermConfig[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !appUser) {
      router.replace('/login');
    }
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    async function load() {
      try {
        const [allIssues, myVisits, allTerms] = await Promise.all([
          getAllIssues(),
          getSupervisorVisits(appUser!.id),
          getAllTermConfigs(),
        ]);
        setIssues(allIssues);
        setVisits(myVisits);
        setTerms(allTerms);
        const active = getActiveTerm(allTerms);
        if (active) setSelectedTermId(active.id);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [appUser]);

  const handleRefresh = useCallback(async () => {
    if (!appUser) return;
    const [allIssues, myVisits, allTerms] = await Promise.all([
      getAllIssues(),
      getSupervisorVisits(appUser.id),
      getAllTermConfigs(),
    ]);
    setIssues(allIssues);
    setVisits(myVisits);
    setTerms(allTerms);
  }, [appUser]);

  const { refreshing, pullDistance, containerRef } = usePullRefresh({ onRefresh: handleRefresh });

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  const selectedTerm = terms.find((t) => t.id === selectedTermId);
  const filteredIssues = selectedTerm
    ? issues.filter((i) => {
        const d = i.created_at.split('T')[0];
        return d >= selectedTerm.start_date && d <= selectedTerm.end_date;
      })
    : issues;
  const filteredVisits = selectedTerm
    ? visits.filter((v) => v.visit_date >= selectedTerm.start_date && v.visit_date <= selectedTerm.end_date)
    : visits;

  const issuesOnly = filteredIssues.filter((i) => !i.submission_type || i.submission_type === 'issue');
  const strengthsOnly = filteredIssues.filter((i) => i.submission_type === 'strength');
  const recentAll = [...filteredIssues].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 8);

  return (
    <div ref={containerRef} className="space-y-6">
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} />

      {/* Greeting */}
      <div className="-mx-4 sm:mx-0 rounded-none sm:rounded-xl bg-red-800 p-5 text-white shadow">
        <p className="text-sm text-white/70">Welcome back,</p>
        <h2 className="text-xl font-bold">{appUser.name}</h2>
        <p className="mt-0.5 text-xs text-amber-300/90 font-medium uppercase tracking-wider">{appUser.role}</p>
      </div>

      {/* Term filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 shrink-0">Period:</label>
        <select
          value={selectedTermId}
          onChange={(e) => setSelectedTermId(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm"
        >
          <option value="">All time</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>{t.term} {t.year}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Supervisions" value={filteredVisits.length} color="bg-indigo-50 text-indigo-700" />
        <StatCard label="Issues" value={issuesOnly.length} color="bg-red-50 text-red-700" />
        <StatCard label="Strengths" value={strengthsOnly.length} color="bg-green-50 text-green-700" />
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Issues Card */}
        <button
          onClick={() => router.push('/issues')}
          className="card-press flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-red-300 transition-colors text-left"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-800">
            <ExclamationTriangleIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Issues</p>
            <p className="text-xs text-gray-500 mt-0.5">Problems to address</p>
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="rounded-full bg-red-800 px-2.5 py-0.5 text-xs font-bold text-white">
              {issuesOnly.length}
            </span>
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Strengths Card */}
        <button
          onClick={() => router.push('/strengths')}
          className="card-press flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-green-300 transition-colors text-left"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-700">
            <TrophyIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Strengths</p>
            <p className="text-xs text-gray-500 mt-0.5">Achievements to celebrate</p>
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="rounded-full bg-green-700 px-2.5 py-0.5 text-xs font-bold text-white">
              {strengthsOnly.length}
            </span>
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Routine Supervision Tools */}
      <button
        onClick={() => router.push('/supervision')}
        className="w-full card-press flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-amber-300 transition-colors"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-800 shadow">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">Routine Supervision Tools</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-300 uppercase tracking-wide">Coming Soon</span>
          </div>
          <p className="text-xs text-gray-500">Structured assessment forms by department</p>
        </div>
        <svg className="ml-auto h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Recent Submissions — mixed feed */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Recent Submissions</h3>
          <button
            onClick={() => router.push('/issues/new')}
            className="rounded-full bg-red-800 px-3 py-1 text-xs font-semibold text-white"
          >
            + Add
          </button>
        </div>

        {fetching ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : recentAll.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
            No submissions logged yet. Tap &quot;+ Add&quot; to record one.
          </p>
        ) : (
          <div className="space-y-3">
            {recentAll.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Visits */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">My Recent Supervisions</h3>
          <button
            onClick={() => router.push('/visits/new')}
            className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
          >
            + Log
          </button>
        </div>

        {fetching ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
            No visits logged yet.
          </p>
        ) : (
          <div className="space-y-2">
            {visits.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{v.school_name}</p>
                  <p className="text-xs text-gray-500">{v.term} · Week {v.week} · {new Date(v.visit_date).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('Remove this supervision log?')) return;
                    await deleteVisitLog(v.id);
                    setVisits((prev) => prev.filter((x) => x.id !== v.id));
                  }}
                  className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Remove"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl p-3 sm:p-4 shadow-sm ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] sm:text-xs font-medium opacity-80 leading-tight mt-0.5">{label}</p>
    </div>
  );
}

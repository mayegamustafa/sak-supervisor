'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllIssues, getSupervisorVisits, getAllTermConfigs, getActiveTerm } from '@/lib/firestore';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import PullIndicator from '@/components/PullIndicator';
import IssueCard from '@/components/IssueCard';
import type { Issue, VisitLog, TermConfig } from '@/types';

export default function DashboardPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [terms, setTerms] = useState<TermConfig[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [fetching, setFetching] = useState(true);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);

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

  // Filter by selected term
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

  const myIssues = filteredIssues.filter((i) => i.created_by === appUser.name);
  const pendingIssues = myIssues.filter((i) => i.status === 'Pending');
  const resolvedIssues = myIssues.filter((i) => i.status === 'Resolved');
  const recent = myIssues.slice(0, 5);

  // Issues per school (all users)
  const issuesPerSchool: Record<string, Issue[]> = {};
  filteredIssues.forEach((i) => {
    if (!issuesPerSchool[i.school_name]) issuesPerSchool[i.school_name] = [];
    issuesPerSchool[i.school_name].push(i);
  });

  return (
    <div ref={containerRef} className="space-y-6">
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} />
      {/* Greeting */}
      <div className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl bg-gradient-to-br from-red-800 via-red-900 to-red-950 p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full -translate-y-8 translate-x-8" />
        <p className="text-sm text-white/70">Welcome back,</p>
        <h2 className="text-xl font-bold">{appUser.name}</h2>
        <p className="mt-0.5 text-xs text-amber-300/80 font-medium uppercase tracking-wider">{appUser.role}</p>
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
        <StatCard label="Pending" value={pendingIssues.length} color="bg-red-50 text-red-700" />
        <StatCard label="Resolved" value={resolvedIssues.length} color="bg-green-50 text-green-700" />
      </div>

      {/* Issues per school — clickable */}
      <section>
        <h2 className="mb-3 text-base font-bold text-gray-900">Issues per School</h2>
        {fetching ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : Object.keys(issuesPerSchool).length === 0 ? (
          <p className="text-sm text-gray-400">No issues for this period.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(issuesPerSchool)
              .sort((a, b) => b[1].length - a[1].length)
              .map(([school, schoolIssues]) => (
                <div key={school}>
                  <button
                    onClick={() => setExpandedSchool(expandedSchool === school ? null : school)}
                    className="flex w-full items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-800">{school}</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-900">
                        {schoolIssues.length}
                      </span>
                      <svg className={`h-4 w-4 text-gray-400 transition-transform ${expandedSchool === school ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {expandedSchool === school && (
                    <div className="mt-2 ml-2 space-y-2">
                      {schoolIssues.map((issue) => (
                        <IssueCard key={issue.id} issue={issue} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/report')}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-100 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print My Report
        </button>
      </div>

      {/* Recent Issues */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Recent Issues</h3>
          <button
            onClick={() => router.push('/issues/new')}
            className="rounded-full bg-red-800 px-3 py-1 text-xs font-semibold text-white"
          >
            + Add
          </button>
        </div>

        {fetching ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
            No issues logged yet. Tap &quot;+ Add&quot; to report one.
          </p>
        ) : (
          <div className="space-y-3">
            {recent.map((issue) => (
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
            {visits.slice(0, 4).map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{v.school_name}</p>
                  <p className="text-xs text-gray-500">{v.term} · Week {v.week}</p>
                </div>
                <span className="ml-3 shrink-0 text-xs text-gray-400">
                  {new Date(v.visit_date).toLocaleDateString()}
                </span>
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

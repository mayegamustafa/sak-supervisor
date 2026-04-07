'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllIssues, getAllVisits, getAllSchools, getAllTermConfigs, getActiveTerm } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import PullIndicator from '@/components/PullIndicator';
import IssueCard from '@/components/IssueCard';
import type { Issue, VisitLog, School, TermConfig } from '@/types';

export default function AdminDashboardPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [terms, setTerms] = useState<TermConfig[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [fetching, setFetching] = useState(true);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [expandedSupervisor, setExpandedSupervisor] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!appUser) router.replace('/login');
      else if (appUser.role !== 'admin') router.replace('/dashboard');
    }
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser || appUser.role !== 'admin') return;
    Promise.all([getAllIssues(), getAllVisits(), getAllSchools(), getAllTermConfigs()]).then(
      ([i, v, s, t]) => {
        setIssues(i);
        setVisits(v);
        setSchools(s);
        setTerms(t);
        const active = getActiveTerm(t);
        if (active) setSelectedTermId(active.id);
        setFetching(false);
      }
    );
  }, [appUser]);

  const handleRefresh = useCallback(async () => {
    const [i, v, s, t] = await Promise.all([getAllIssues(), getAllVisits(), getAllSchools(), getAllTermConfigs()]);
    setIssues(i);
    setVisits(v);
    setSchools(s);
    setTerms(t);
  }, []);

  const { refreshing, pullDistance, containerRef } = usePullRefresh({ onRefresh: handleRefresh });

  if (loading || !appUser || appUser.role !== 'admin') return (
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

  const pending = filteredIssues.filter((i) => i.status === 'Pending');
  const resolved = filteredIssues.filter((i) => i.status === 'Resolved');
  const inProgress = filteredIssues.filter((i) => i.status === 'In Progress');

  // Issues per school (store actual issues for drill-down)
  const issuesPerSchool: Record<string, Issue[]> = {};
  filteredIssues.forEach((i) => {
    if (!issuesPerSchool[i.school_name]) issuesPerSchool[i.school_name] = [];
    issuesPerSchool[i.school_name].push(i);
  });

  // Visits per supervisor (store actual visits for drill-down)
  const visitsPerSupervisor: Record<string, VisitLog[]> = {};
  filteredVisits.forEach((v) => {
    if (!visitsPerSupervisor[v.supervisor_name]) visitsPerSupervisor[v.supervisor_name] = [];
    visitsPerSupervisor[v.supervisor_name].push(v);
  });

  // Visits this week (approximate: past 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const visitsThisWeek = filteredVisits.filter((v) => new Date(v.visit_date) >= weekAgo);

  return (
    <div ref={containerRef} className="space-y-6">
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} />
      <div className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl bg-gradient-to-br from-blue-700 to-blue-800 p-5 text-white shadow-md">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <p className="text-sm opacity-80 mt-0.5">SAK / CPS Schools Supervision</p>
      </div>

      {/* Term filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 shrink-0">Period:</label>
        <select
          value={selectedTermId}
          onChange={(e) => { setSelectedTermId(e.target.value); setExpandedSchool(null); setExpandedSupervisor(null); }}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm"
        >
          <option value="">All time</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>{t.term} {t.year}</option>
          ))}
        </select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        <StatCard label="Total Issues" value={filteredIssues.length} color="bg-blue-50 text-blue-700" />
        <StatCard label="Pending" value={pending.length} color="bg-red-50 text-red-700" />
        <StatCard label="In Progress" value={inProgress.length} color="bg-yellow-50 text-yellow-800" />
        <StatCard label="Resolved" value={resolved.length} color="bg-green-50 text-green-700" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard label="Schools" value={schools.length} color="bg-indigo-50 text-indigo-700" />
        <StatCard label="Visits (7d)" value={visitsThisWeek.length} color="bg-purple-50 text-purple-700" />
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
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
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

      {/* Supervisor visits — clickable */}
      <section>
        <h2 className="mb-3 text-base font-bold text-gray-900">Visits per Supervisor</h2>
        {fetching ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : Object.keys(visitsPerSupervisor).length === 0 ? (
          <p className="text-sm text-gray-400">No visits for this period.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(visitsPerSupervisor)
              .sort((a, b) => b[1].length - a[1].length)
              .map(([supervisor, supVisits]) => (
                <div key={supervisor}>
                  <button
                    onClick={() => setExpandedSupervisor(expandedSupervisor === supervisor ? null : supervisor)}
                    className="flex w-full items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-800">{supervisor}</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                        {supVisits.length} visits
                      </span>
                      <svg className={`h-4 w-4 text-gray-400 transition-transform ${expandedSupervisor === supervisor ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {expandedSupervisor === supervisor && (
                    <div className="mt-2 ml-2 space-y-2">
                      {supVisits.map((v) => (
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
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Recent issues */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Recent Issues</h2>
          <button
            onClick={() => router.push('/issues')}
            className="text-sm font-medium text-blue-600"
          >
            View all →
          </button>
        </div>
        {fetching ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="space-y-3">
            {filteredIssues.slice(0, 6).map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => router.push('/schools/new')} className="rounded-xl bg-blue-600 py-4 font-semibold text-white shadow">
          + Add School
        </button>
        <button onClick={() => router.push('/schools')} className="rounded-xl border border-blue-600 py-4 font-semibold text-blue-600">
          Manage Schools
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => router.push('/admin/users')} className="rounded-xl bg-indigo-600 py-4 font-semibold text-white shadow">
          Manage Users
        </button>
        <button onClick={() => router.push('/admin/terms')} className="rounded-xl border border-indigo-600 py-4 font-semibold text-indigo-600">
          Term Settings
        </button>
      </div>
      <button
        onClick={() => router.push('/report')}
        className="w-full rounded-xl bg-gray-800 py-4 font-semibold text-white shadow"
      >
        Print Issues Report
      </button>
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

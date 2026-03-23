'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllIssues, getAllVisits, getAllSchools } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import IssueCard from '@/components/IssueCard';
import type { Issue, VisitLog, School } from '@/types';

export default function AdminDashboardPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!appUser) router.replace('/login');
      else if (appUser.role !== 'admin') router.replace('/dashboard');
    }
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser || appUser.role !== 'admin') return;
    Promise.all([getAllIssues(), getAllVisits(), getAllSchools()]).then(
      ([i, v, s]) => {
        setIssues(i);
        setVisits(v);
        setSchools(s);
        setFetching(false);
      }
    );
  }, [appUser]);

  if (loading || !appUser || appUser.role !== 'admin') return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  const pending = issues.filter((i) => i.status === 'Pending');
  const resolved = issues.filter((i) => i.status === 'Resolved');
  const inProgress = issues.filter((i) => i.status === 'In Progress');

  // Issues per school
  const issuesPerSchool: Record<string, number> = {};
  issues.forEach((i) => {
    issuesPerSchool[i.school_name] = (issuesPerSchool[i.school_name] ?? 0) + 1;
  });

  // Visits per supervisor
  const visitsPerSupervisor: Record<string, number> = {};
  visits.forEach((v) => {
    visitsPerSupervisor[v.supervisor_name] = (visitsPerSupervisor[v.supervisor_name] ?? 0) + 1;
  });

  // Visits this week (approximate: past 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const visitsThisWeek = visits.filter((v) => new Date(v.visit_date) >= weekAgo);

  return (
    <div className="space-y-6">
      <div className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl bg-gradient-to-br from-blue-700 to-blue-800 p-5 text-white shadow-md">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <p className="text-sm opacity-80 mt-0.5">Sir Apollo Kaggwa Schools Supervision</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        <StatCard label="Total Issues" value={issues.length} color="bg-blue-50 text-blue-700" />
        <StatCard label="Pending" value={pending.length} color="bg-red-50 text-red-700" />
        <StatCard label="In Progress" value={inProgress.length} color="bg-yellow-50 text-yellow-800" />
        <StatCard label="Resolved" value={resolved.length} color="bg-green-50 text-green-700" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard label="Schools" value={schools.length} color="bg-indigo-50 text-indigo-700" />
        <StatCard label="Visits (7d)" value={visitsThisWeek.length} color="bg-purple-50 text-purple-700" />
      </div>

      {/* Issues per school */}
      <section>
        <h2 className="mb-3 text-base font-bold text-gray-900">Issues per School</h2>
        {fetching ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : Object.keys(issuesPerSchool).length === 0 ? (
          <p className="text-sm text-gray-400">No issues yet.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(issuesPerSchool)
              .sort((a, b) => b[1] - a[1])
              .map(([school, count]) => (
                <div key={school} className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
                  <span className="text-sm font-medium text-gray-800">{school}</span>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Supervisor visits */}
      <section>
        <h2 className="mb-3 text-base font-bold text-gray-900">Visits per Supervisor</h2>
        {fetching ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : Object.keys(visitsPerSupervisor).length === 0 ? (
          <p className="text-sm text-gray-400">No visits yet.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(visitsPerSupervisor)
              .sort((a, b) => b[1] - a[1])
              .map(([supervisor, count]) => (
                <div key={supervisor} className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
                  <span className="text-sm font-medium text-gray-800">{supervisor}</span>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                    {count} visits
                  </span>
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
            {issues.slice(0, 6).map((issue) => (
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

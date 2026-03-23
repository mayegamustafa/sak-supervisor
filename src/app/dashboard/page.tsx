'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllIssues, getSupervisorVisits } from '@/lib/firestore';
import IssueCard from '@/components/IssueCard';
import type { Issue, VisitLog } from '@/types';

export default function DashboardPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [visits, setVisits] = useState<VisitLog[]>([]);
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
        const [allIssues, myVisits] = await Promise.all([
          getAllIssues(),
          getSupervisorVisits(appUser!.id),
        ]);
        setIssues(allIssues);
        setVisits(myVisits);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [appUser]);

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  const myIssues = issues.filter((i) => i.created_by === appUser.name);
  const pendingIssues = myIssues.filter((i) => i.status === 'Pending');
  const resolvedIssues = myIssues.filter((i) => i.status === 'Resolved');
  const recent = myIssues.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-md">
        <p className="text-sm opacity-80">Welcome back,</p>
        <h2 className="text-xl font-bold">{appUser.name}</h2>
        <p className="mt-0.5 text-xs opacity-70 capitalize">{appUser.role}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Supervisions" value={visits.length} color="bg-indigo-50 text-indigo-700" />
        <StatCard label="Pending" value={pendingIssues.length} color="bg-red-50 text-red-700" />
        <StatCard label="Resolved" value={resolvedIssues.length} color="bg-green-50 text-green-700" />
      </div>

      {/* Recent Issues */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Recent Issues</h3>
          <button
            onClick={() => router.push('/issues/new')}
            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
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

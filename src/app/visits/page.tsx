'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupervisorVisits } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import type { VisitLog } from '@/types';

export default function VisitsPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    getSupervisorVisits(appUser.id).then((v) => { setVisits(v); setFetching(false); });
  }, [appUser]);

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">My Supervision Logs</h1>
        <button
          onClick={() => router.push('/visits/new')}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          + Log Supervision
        </button>
      </div>

      {fetching ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : visits.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No supervisions logged yet.</p>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <div key={v.id} className="card-press rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{v.school_name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {v.term} · Week {v.week} · {new Date(v.visit_date).toLocaleDateString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  W{v.week}
                </span>
              </div>
              {v.visit_notes && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{v.visit_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

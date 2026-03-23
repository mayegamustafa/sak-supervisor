'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllSchools } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import type { School } from '@/types';

export default function SchoolsPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    getAllSchools().then((s) => { setSchools(s); setFetching(false); });
  }, [appUser]);

  const filtered = schools.filter((s) =>
    s.school_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Schools</h1>
        {appUser.role === 'admin' && (
          <button
            onClick={() => router.push('/schools/new')}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            + Add School
          </button>
        )}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by school name…"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
      />

      {fetching ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No schools found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((school) => (
            <div
              key={school.id}
              onClick={() => router.push(`/schools/${school.id}`)}
              className="card-press cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-gray-900">{school.school_name}</p>
                <svg className="h-5 w-5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

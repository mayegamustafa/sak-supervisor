'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllIssues, getCustomCategories, saveCustomCategories } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import PullIndicator from '@/components/PullIndicator';
import { TagIcon } from '@/components/Icons';
import { normalizeCategory } from '@/lib/categories';
import type { Issue } from '@/types';

const BASE_CATEGORIES = ['Academic', 'Quality', 'Finance', 'Infrastructure', 'TDP'];

interface Department {
  name: string;
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

function buildDepartments(issues: Issue[], custom: string[]): Department[] {
  const names = new Set<string>([
    ...BASE_CATEGORIES,
    ...custom.map((c) => normalizeCategory(c)),
    ...issues.map((i) => normalizeCategory(i.category)).filter(Boolean),
  ]);
  return Array.from(names)
    .map((name) => {
      const inDept = issues.filter((i) => normalizeCategory(i.category) === name);
      return {
        name,
        total: inDept.length,
        pending: inDept.filter((i) => i.status === 'Pending').length,
        inProgress: inDept.filter((i) => i.status === 'In Progress').length,
        resolved: inDept.filter((i) => i.status === 'Resolved').length,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export default function DepartmentsPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(true);

  // Add-department (admin only)
  const [adding, setAdding] = useState(false);
  const [newDept, setNewDept] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const isAdmin = appUser?.role === 'admin';

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  const load = useCallback(async () => {
    const [issues, custom] = await Promise.all([
      getAllIssues(),
      getCustomCategories().catch(() => [] as string[]),
    ]);
    setCustomCats(custom);
    setDepartments(buildDepartments(issues, custom));
  }, []);

  useEffect(() => {
    if (!appUser) return;
    Promise.all([getAllIssues(), getCustomCategories().catch(() => [] as string[])])
      .then(([issues, custom]) => {
        setCustomCats(custom);
        setDepartments(buildDepartments(issues, custom));
      })
      .catch((e) => {
        console.error(e);
        setDepartments(buildDepartments([], []));
      })
      .finally(() => setFetching(false));
  }, [appUser]);

  async function handleAddDepartment() {
    const trimmed = newDept.trim();
    if (!trimmed) return;
    const canonical = normalizeCategory(trimmed);
    const exists = departments.some((d) => d.name.toLowerCase() === canonical.toLowerCase());
    if (exists) {
      setAddError('That department already exists.');
      return;
    }
    setSaving(true);
    setAddError('');
    try {
      const updated = [...customCats, trimmed];
      await saveCustomCategories(updated);
      await load();
      setNewDept('');
      setAdding(false);
    } catch (err) {
      console.error(err);
      setAddError('Failed to add. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const { refreshing, pullDistance, containerRef } = usePullRefresh({ onRefresh: load });

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  return (
    <div ref={containerRef} className="space-y-4">
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Departments</h1>
        {isAdmin && !adding && (
          <button
            onClick={() => { setAdding(true); setAddError(''); }}
            className="rounded-full bg-red-800 px-4 py-2 text-sm font-semibold text-white"
          >
            + Add Department
          </button>
        )}
      </div>

      {isAdmin && adding && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newDept}
              autoFocus
              onChange={(e) => { setNewDept(e.target.value); setAddError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
              placeholder="e.g. Theology, Community Relations"
              maxLength={40}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={handleAddDepartment}
              disabled={saving || !newDept.trim()}
              className="rounded-xl bg-red-800 px-5 py-3 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-50"
            >
              {saving ? '…' : 'Add'}
            </button>
            <button
              onClick={() => { setAdding(false); setNewDept(''); setAddError(''); }}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700"
            >
              Cancel
            </button>
          </div>
          {addError && <p className="text-xs text-orange-700">{addError}</p>}
          <p className="text-xs text-gray-400">New departments also appear as a category in the Report Observation form.</p>
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by department…"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
      />

      {fetching ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No departments found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((dept) => (
            <div
              key={dept.name}
              onClick={() => router.push(`/departments/${encodeURIComponent(dept.name)}`)}
              className="card-press cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-800">
                    <TagIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{dept.name}</p>
                    <p className="text-xs text-gray-500">{dept.total} report{dept.total === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <svg className="h-5 w-5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
              {dept.total > 0 && (
                <div className="mt-3 flex gap-2 text-[11px] font-medium">
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">{dept.pending} Pending</span>
                  <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-yellow-800">{dept.inProgress} In Progress</span>
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">{dept.resolved} Resolved</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

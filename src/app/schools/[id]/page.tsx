'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSchool, getSchoolIssues, updateSchool } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import IssueCard from '@/components/IssueCard';
import type { School, Issue, IssueStatus } from '@/types';

const FILTERS: { label: string; value: IssueStatus | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Pending', value: 'Pending' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
];

export default function SchoolDetailPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [school, setSchool] = useState<School | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ school_name: '' });
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<IssueStatus | 'All'>('All');

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!id || !appUser) return;
    Promise.all([getSchool(id), getSchoolIssues(id)]).then(([s, i]) => {
      setSchool(s);
      setIssues(i);
      if (s) setForm({ school_name: s.school_name });
      setFetching(false);
    });
  }, [id, appUser]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    await updateSchool(id, form);
    setSchool((prev) => prev ? { ...prev, ...form } : prev);
    setEditing(false);
    setSaving(false);
  }

  if (loading || fetching || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );
  if (!school) return <p className="p-4 text-gray-500">School not found.</p>;

  return (
    <div className="space-y-6">
      {editing ? (
        <form onSubmit={handleSave} className="space-y-4 rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Edit School</h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">School Name</label>
            <input
              type="text"
              value={form.school_name}
              onChange={(e) => setForm((f) => ({ ...f, school_name: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-red-800 py-3 font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl bg-gradient-to-br from-red-800 via-red-900 to-red-950 p-5 text-white shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold">{school.school_name}</h1>
            </div>
            {appUser.role === 'admin' && (
              <button
                onClick={() => setEditing(true)}
                className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Issue Status Summary */}
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

      {/* Issues */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Issues ({issues.length})</h2>
          <button
            onClick={() => router.push('/issues/new')}
            className="rounded-full bg-red-800 px-3 py-1 text-xs font-semibold text-white"
          >
            + Report
          </button>
        </div>

        {/* Filter tabs */}
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
          <p className="py-6 text-center text-sm text-gray-400">No issues reported for this school.</p>
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

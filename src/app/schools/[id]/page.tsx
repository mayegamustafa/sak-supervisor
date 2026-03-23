'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSchool, getSchoolIssues, updateSchool } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import IssueCard from '@/components/IssueCard';
import type { School, Issue } from '@/types';

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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="-mx-4 sm:mx-0 rounded-none sm:rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-md">
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

      {/* Issues */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Issues ({issues.length})</h2>
          <button
            onClick={() => router.push('/issues/new')}
            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
          >
            + Report
          </button>
        </div>

        {issues.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No issues reported for this school.</p>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
          </div>
        )}
      </section>
    </div>
  );
}

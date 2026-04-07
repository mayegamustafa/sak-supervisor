'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSchool } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';

export default function NewSchoolPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ school_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (appUser && appUser.role !== 'admin') {
    router.replace('/schools');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.school_name.trim()) { setError('School name is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await createSchool(form);
      router.push('/schools');
    } catch {
      setError('Failed to create school.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-lg font-bold text-gray-900">Add New School</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">School Name *</label>
          <input
            type="text"
            value={form.school_name}
            onChange={(e) => setForm((f) => ({ ...f, school_name: e.target.value }))}
            placeholder="e.g. SAK / CPS - MENGO"
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-red-800 py-4 text-base font-bold text-white shadow-sm hover:bg-red-900 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create School'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logVisit } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import type { School, Term } from '@/types';

const TERMS: Term[] = ['Term 1', 'Term 2', 'Term 3'];
const WEEKS = Array.from({ length: 14 }, (_, i) => i + 1);

interface Props {
  schools: School[];
}

export default function VisitForm({ schools }: Props) {
  const { appUser } = useAuth();
  const router = useRouter();

  const today = new Date().toISOString().split('T')[0];

  const [school_id, setSchoolId] = useState('');
  const [visit_date, setVisitDate] = useState(today);
  const [term, setTerm] = useState<Term>('Term 1');
  const [week, setWeek] = useState(1);
  const [visit_notes, setVisitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedSchool = schools.find((s) => s.id === school_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser) return;
    if (!school_id) { setError('Please select a school.'); return; }

    setSubmitting(true);
    setError('');

    try {
      await logVisit({
        supervisor_id: appUser.id,
        supervisor_name: appUser.name,
        school_id,
        school_name: selectedSchool?.school_name ?? '',
        visit_date,
        term,
        week,
        visit_notes,
      });
      router.push('/visits');
    } catch (err) {
      console.error(err);
      setError('Failed to log visit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* School */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">School *</label>
        <select
          value={school_id}
          onChange={(e) => setSchoolId(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          required
        >
          <option value="">Select school…</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.school_name}</option>
          ))}
        </select>
      </div>

      {/* Visit Date */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Visit Date *</label>
        <input
          type="date"
          value={visit_date}
          onChange={(e) => setVisitDate(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      {/* Term */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Term *</label>
        <div className="grid grid-cols-3 gap-2">
          {TERMS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTerm(t)}
              className={`rounded-xl border py-3 text-sm font-medium transition-colors ${
                term === t
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Week */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Week *</label>
        <select
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
        >
          {WEEKS.map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Visit Notes</label>
        <textarea
          value={visit_notes}
          onChange={(e) => setVisitNotes(e.target.value)}
          rows={4}
          placeholder="General observations from this supervision…"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-blue-600 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? 'Logging Supervision…' : 'Log Supervision'}
      </button>
    </form>
  );
}

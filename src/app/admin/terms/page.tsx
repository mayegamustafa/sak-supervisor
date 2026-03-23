'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllTermConfigs, saveTermConfig, updateTermConfig, getActiveTerm, getWeekNumber } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import type { TermConfig, Term } from '@/types';

const TERMS: Term[] = ['Term 1', 'Term 2', 'Term 3'];

export default function TermsPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [configs, setConfigs] = useState<TermConfig[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [term, setTerm] = useState<Term>('Term 1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!appUser) router.replace('/login');
      else if (appUser.role !== 'admin') router.replace('/dashboard');
    }
  }, [loading, appUser, router]);

  const load = useCallback(async () => {
    const t = await getAllTermConfigs();
    setConfigs(t);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (appUser?.role === 'admin') load();
  }, [appUser, load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editId) {
        await updateTermConfig(editId, { term, year, start_date: startDate, end_date: endDate });
      } else {
        await saveTermConfig({
          term,
          year,
          start_date: startDate,
          end_date: endDate,
          created_by: appUser!.name,
        });
      }
      setShowAdd(false);
      setEditId(null);
      setTerm('Term 1');
      setStartDate('');
      setEndDate('');
      load();
    } catch {
      setError('Failed to save term config');
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(tc: TermConfig) {
    setEditId(tc.id);
    setTerm(tc.term);
    setYear(tc.year);
    setStartDate(tc.start_date);
    setEndDate(tc.end_date);
    setShowAdd(true);
  }

  const activeTerm = getActiveTerm(configs);
  const currentWeek = activeTerm ? getWeekNumber(activeTerm.start_date) : null;

  if (loading || !appUser || appUser.role !== 'admin') {
    return <div className="flex min-h-[60dvh] items-center justify-center"><div className="spinner" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Term Dates</h1>
        <button
          onClick={() => { setShowAdd(!showAdd); setEditId(null); setError(''); }}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          + Add Term
        </button>
      </div>

      {/* Active term banner */}
      {activeTerm && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-semibold text-green-800">
            Current: {activeTerm.term} {activeTerm.year} &middot; Week {currentWeek}
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            {new Date(activeTerm.start_date).toLocaleDateString()} — {new Date(activeTerm.end_date).toLocaleDateString()}
          </p>
        </div>
      )}

      {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      {showAdd && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h2 className="font-semibold text-gray-800">{editId ? 'Edit Term' : 'New Term'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value as Term)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
            >
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={2020}
              max={2040}
              className="rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-60">
            {submitting ? 'Saving…' : editId ? 'Update Term' : 'Save Term'}
          </button>
        </form>
      )}

      {fetching ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : configs.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No terms configured yet.</p>
      ) : (
        <div className="space-y-3">
          {configs.map((tc) => {
            const isActive = activeTerm?.id === tc.id;
            return (
              <div key={tc.id} className={`rounded-xl border p-4 shadow-sm ${isActive ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{tc.term} {tc.year}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tc.start_date).toLocaleDateString()} — {new Date(tc.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">Active</span>}
                    <button onClick={() => handleEdit(tc)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

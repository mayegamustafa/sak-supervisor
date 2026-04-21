'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCustomCategories, saveCustomCategories } from '@/lib/firestore';

const BASE_CATEGORIES = ['Academic', 'Quality', 'Finance', 'Infrastructure', 'TDP', 'Other'];

export default function AdminCategoriesPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  const [customCats, setCustomCats] = useState<string[]>([]);
  const [newCat, setNewCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
    if (!loading && appUser && appUser.role !== 'admin') router.replace('/dashboard');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser || appUser.role !== 'admin') return;
    getCustomCategories().then((cats) => {
      setCustomCats(cats);
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [appUser]);

  async function handleAdd() {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (BASE_CATEGORIES.map((c) => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      setMessage('This category already exists in the default list.');
      return;
    }
    if (customCats.map((c) => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      setMessage('Category already added.');
      return;
    }
    const updated = [...customCats, trimmed];
    setSaving(true);
    await saveCustomCategories(updated);
    setCustomCats(updated);
    setNewCat('');
    setMessage('');
    setSaving(false);
  }

  async function handleRemove(cat: string) {
    const updated = customCats.filter((c) => c !== cat);
    setSaving(true);
    await saveCustomCategories(updated);
    setCustomCats(updated);
    setSaving(false);
  }

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center"><div className="spinner" /></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-800">
          ← Back
        </button>
        <h1 className="text-lg font-bold text-gray-900">Observation Categories</h1>
      </div>

      {/* Default categories (read-only) */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Default Categories</h2>
        <div className="flex flex-wrap gap-2">
          {BASE_CATEGORIES.map((c) => (
            <span
              key={c}
              className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-sm text-gray-700 font-medium"
            >
              {c}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Default categories cannot be removed.</p>
      </section>

      {/* Custom categories */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Custom Categories</h2>
        {fetching ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : customCats.length === 0 ? (
          <p className="text-sm text-gray-400 rounded-xl border border-dashed border-gray-300 p-4 text-center">
            No custom categories yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customCats.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-sm text-red-800 font-medium"
              >
                {c}
                <button
                  onClick={() => handleRemove(c)}
                  disabled={saving}
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-200 text-red-700 hover:bg-red-300 text-xs leading-none disabled:opacity-50"
                  aria-label={`Remove ${c}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Add new category */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Add Category</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCat}
            onChange={(e) => { setNewCat(e.target.value); setMessage(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. Community Relations"
            maxLength={40}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newCat.trim()}
            className="rounded-xl bg-red-800 px-5 py-3 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {message && (
          <p className="mt-1.5 text-xs text-orange-700">{message}</p>
        )}
        <p className="text-xs text-gray-400 mt-1.5">
          Custom categories appear alongside defaults in the observation form.
        </p>
      </section>
    </div>
  );
}

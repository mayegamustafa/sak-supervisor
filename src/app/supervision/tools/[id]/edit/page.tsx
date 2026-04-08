'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getSupervisionTool, updateSupervisionTool } from '@/lib/firestore-supervision';
import type { ToolArea, SupervisionTool } from '@/types';

const DEPARTMENTS = [
  'Finance',
  'Academic',
  'Quality Assurance',
  'Administration',
  'ICT',
  'Library',
  'Guidance & Counselling',
  'Sports',
  'Health',
];

function newArea(): ToolArea {
  return {
    id: crypto.randomUUID(),
    name: '',
    expected_score: 0,
    attributes: [''],
  };
}

export default function EditToolPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const toolId = params.id as string;

  const [tool, setTool] = useState<SupervisionTool | null>(null);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [customDept, setCustomDept] = useState('');
  const [areas, setAreas] = useState<ToolArea[]>([]);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser || !toolId) return;
    getSupervisionTool(toolId)
      .then((t) => {
        if (!t) {
          router.replace('/supervision');
          return;
        }
        // Only owner or admin can edit
        if (t.created_by_id !== appUser.id && appUser.role !== 'admin') {
          router.replace('/supervision');
          return;
        }
        setTool(t);
        setName(t.name);
        if (DEPARTMENTS.includes(t.department)) {
          setDepartment(t.department);
        } else {
          setDepartment('__custom__');
          setCustomDept(t.department);
        }
        setAreas(t.areas.length > 0 ? t.areas : [newArea()]);
      })
      .finally(() => setFetching(false));
  }, [appUser, toolId, router]);

  const totalExpected = areas.reduce((sum, a) => sum + (a.expected_score || 0), 0);
  const finalDept = department === '__custom__' ? customDept.trim() : department;
  const isValid = name.trim() && (department && department !== '__custom__' ? true : customDept.trim()) && totalExpected === 100 && areas.every((a) => a.name.trim() && a.expected_score > 0);

  function updateArea(idx: number, patch: Partial<ToolArea>) {
    setAreas((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }

  function removeArea(idx: number) {
    setAreas((prev) => prev.filter((_, i) => i !== idx));
  }

  function addAttribute(areaIdx: number) {
    setAreas((prev) =>
      prev.map((a, i) => (i === areaIdx ? { ...a, attributes: [...a.attributes, ''] } : a))
    );
  }

  function updateAttribute(areaIdx: number, attrIdx: number, value: string) {
    setAreas((prev) =>
      prev.map((a, i) =>
        i === areaIdx
          ? { ...a, attributes: a.attributes.map((attr, j) => (j === attrIdx ? value : attr)) }
          : a
      )
    );
  }

  function removeAttribute(areaIdx: number, attrIdx: number) {
    setAreas((prev) =>
      prev.map((a, i) =>
        i === areaIdx
          ? { ...a, attributes: a.attributes.filter((_, j) => j !== attrIdx) }
          : a
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser || !tool) return;
    if (!isValid) {
      setError(totalExpected !== 100 ? `Expected scores must total 100 (currently ${totalExpected})` : 'Please fill all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const cleanAreas = areas.map((a) => ({
        ...a,
        attributes: a.attributes.filter((attr) => attr.trim()),
      }));

      await updateSupervisionTool(tool.id, {
        name: name.trim(),
        department: finalDept,
        areas: cleanAreas,
      });

      router.push('/supervision');
    } catch (err) {
      console.error(err);
      setError('Failed to update tool. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !appUser || fetching)
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="spinner" />
      </div>
    );

  if (!tool) return null;

  return (
    <div className="pb-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg bg-gray-100 p-2 text-gray-600 active:bg-gray-200">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Edit Tool</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tool Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Tool Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Academic Supervision Tool 2026"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
            required
          />
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Department *</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
            required
          >
            <option value="">Select department…</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="__custom__">Other (custom)…</option>
          </select>
        </div>
        {department === '__custom__' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Custom Department *</label>
            <input
              type="text"
              value={customDept}
              onChange={(e) => setCustomDept(e.target.value)}
              placeholder="Enter department name"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
              required
            />
          </div>
        )}

        {/* Running Total */}
        <div className={`rounded-xl border-2 p-3 text-center font-bold text-lg ${
          totalExpected === 100
            ? 'border-green-400 bg-green-50 text-green-800'
            : totalExpected > 100
            ? 'border-red-400 bg-red-50 text-red-800'
            : 'border-amber-400 bg-amber-50 text-amber-800'
        }`}>
          Total Expected: {totalExpected} / 100
          {totalExpected === 100 && <span className="ml-2">✓</span>}
          {totalExpected > 100 && <span className="ml-2 text-sm font-normal">(exceeds 100!)</span>}
        </div>

        {/* Areas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Areas</h2>
            <button
              type="button"
              onClick={() => setAreas((prev) => [...prev, newArea()])}
              className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 active:bg-amber-200"
            >
              + Add Area
            </button>
          </div>

          {areas.map((area, aIdx) => (
            <div key={area.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-800 text-xs font-bold text-white">
                  {aIdx + 1}
                </span>
                {areas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArea(aIdx)}
                    className="rounded-lg p-1 text-red-500 hover:bg-red-50 active:bg-red-100"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Area Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Area Name *</label>
                <input
                  type="text"
                  value={area.name}
                  onChange={(e) => updateArea(aIdx, { name: e.target.value })}
                  placeholder="e.g. Curriculum Implementation"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              {/* Expected Score */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Expected Score *</label>
                <input
                  type="number"
                  value={area.expected_score || ''}
                  onChange={(e) => updateArea(aIdx, { expected_score: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 20"
                  min={1}
                  max={100}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              {/* Attributes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-600">Attributes (Checklist Items)</label>
                  <button
                    type="button"
                    onClick={() => addAttribute(aIdx)}
                    className="text-xs font-semibold text-amber-700 active:text-amber-900"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-2">
                  {area.attributes.map((attr, atIdx) => (
                    <div key={atIdx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 shrink-0">{atIdx + 1}.</span>
                      <input
                        type="text"
                        value={attr}
                        onChange={(e) => updateAttribute(aIdx, atIdx, e.target.value)}
                        placeholder="e.g. Schemes of work available"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                      />
                      {area.attributes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAttribute(aIdx, atIdx)}
                          className="shrink-0 rounded p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !isValid}
          className="w-full rounded-xl bg-red-800 py-3.5 text-base font-bold text-white shadow-sm disabled:opacity-50 active:bg-red-900"
        >
          {submitting ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

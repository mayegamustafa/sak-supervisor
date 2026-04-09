'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createSupervisionTool } from '@/lib/firestore-supervision';
import { createNotification } from '@/lib/firestore';
import { sendPush } from '@/lib/messaging';
import type { ToolArea } from '@/types';

const DEPARTMENTS = [
  'Finance',
  'Academic',
  'Quality Assurance',
  'Theology',
  'TDP',
];

function newArea(): ToolArea {
  return {
    id: crypto.randomUUID(),
    name: '',
    expected_score: 0,
    attributes: [''],
  };
}

export default function NewToolPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [customDept, setCustomDept] = useState('');
  const [areas, setAreas] = useState<ToolArea[]>([newArea()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalExpected = areas.reduce((sum, a) => sum + (a.expected_score || 0), 0);
  const isValid = name.trim() && (department || customDept.trim()) && totalExpected === 100 && areas.every((a) => a.name.trim() && a.expected_score > 0);
  const finalDept = department === '__custom__' ? customDept.trim() : department;

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
    if (!appUser) return;
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

      await createSupervisionTool({
        name: name.trim(),
        department: finalDept,
        areas: cleanAreas,
        created_by: appUser.name,
        created_by_id: appUser.id,
      });

      // Notify all users about the new tool
      const notifTitle = 'New Supervision Tool';
      const notifBody = `${appUser.name} created "${name.trim()}" for ${finalDept} department`;
      createNotification({
        type: 'system',
        title: notifTitle,
        body: notifBody,
        target_all: true,
        created_by: appUser.id,
      }).catch(() => {});
      sendPush({ title: notifTitle, body: notifBody, target_all: true }).catch(() => {});

      router.push('/supervision');
    } catch (err) {
      console.error(err);
      setError('Failed to create tool. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !appUser)
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="spinner" />
      </div>
    );

  return (
    <div className="pb-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg bg-gray-100 p-2 text-gray-600 active:bg-gray-200">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Create Supervision Tool</h1>
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
            ? 'border-green-300 bg-green-50/60 text-green-700'
            : totalExpected > 100
            ? 'border-red-300 bg-red-50/60 text-red-700'
            : 'border-amber-300 bg-amber-50/60 text-amber-700'
        }`}>
          Total Expected: {totalExpected} / 100
          {totalExpected === 100 && <span className="ml-2">✓</span>}
          {totalExpected > 100 && <span className="ml-2 text-sm font-normal">(exceeds 100!)</span>}
        </div>

        {/* Areas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Areas</h2>
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
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-white">
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
          className="w-full rounded-xl bg-gray-800 py-3.5 text-base font-bold text-white shadow-sm disabled:opacity-50 active:bg-gray-900"
        >
          {submitting ? 'Creating…' : 'Create Tool'}
        </button>
      </form>
    </div>
  );
}

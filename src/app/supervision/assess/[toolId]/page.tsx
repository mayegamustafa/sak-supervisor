'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllSchools, createNotification } from '@/lib/firestore';
import { getSupervisionTool, createSupervisionSession } from '@/lib/firestore-supervision';
import { sendPush } from '@/lib/messaging';
import type { SupervisionTool, AreaScore, School } from '@/types';

export default function AssessmentPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const toolId = params.toolId as string;

  const [tool, setTool] = useState<SupervisionTool | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [fetching, setFetching] = useState(true);

  // Form state
  const [schoolId, setSchoolId] = useState('');
  const [areaScores, setAreaScores] = useState<AreaScore[]>([]);
  const [keyStrengths, setKeyStrengths] = useState('');
  const [keyImprovements, setKeyImprovements] = useState('');
  const [supervisorSignature, setSupervisorSignature] = useState('');
  const [headteacherName, setHeadteacherName] = useState('');
  const [headteacherSignature, setHeadteacherSignature] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser || !toolId) return;
    Promise.all([getSupervisionTool(toolId), getAllSchools()])
      .then(([t, s]) => {
        if (!t) {
          router.replace('/supervision');
          return;
        }
        setTool(t);
        setSchools(s);
        setAreaScores(
          t.areas.map((area) => ({
            area_id: area.id,
            area_name: area.name,
            expected_score: area.expected_score,
            actual_score: 0,
            observation: '',
            attributes: area.attributes.filter((a) => a.trim()),
          }))
        );
        setSupervisorSignature(appUser.name);
      })
      .finally(() => setFetching(false));
  }, [appUser, toolId, router]);

  const totalScore = useMemo(
    () => areaScores.reduce((sum, a) => sum + (a.actual_score || 0), 0),
    [areaScores]
  );

  const selectedSchool = schools.find((s) => s.id === schoolId);

  function updateAreaScore(areaId: string, field: 'actual_score' | 'observation', value: string | number) {
    setAreaScores((prev) =>
      prev.map((a) => {
        if (a.area_id !== areaId) return a;
        if (field === 'actual_score') {
          const num = typeof value === 'number' ? value : parseInt(value) || 0;
          if (num > a.expected_score) {
            setScoreErrors((e) => ({ ...e, [areaId]: `Cannot exceed ${a.expected_score}` }));
            return a;
          }
          if (num < 0) return a;
          setScoreErrors((e) => {
            const copy = { ...e };
            delete copy[areaId];
            return copy;
          });
          return { ...a, actual_score: num };
        }
        return { ...a, observation: value as string };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser || !tool) return;
    if (!schoolId) { setError('Please select a school.'); return; }
    if (Object.keys(scoreErrors).length > 0) { setError('Fix score errors before submitting.'); return; }

    setSubmitting(true);
    setError('');

    try {
      const sessionId = await createSupervisionSession({
        tool_id: tool.id,
        tool_name: tool.name,
        department: tool.department,
        school_id: schoolId,
        school_name: selectedSchool?.school_name ?? '',
        supervisor_id: appUser.id,
        supervisor_name: appUser.name,
        total_score: totalScore,
        area_scores: areaScores,
        key_strengths: keyStrengths.trim(),
        key_improvements: keyImprovements.trim(),
        supervisor_signature: supervisorSignature.trim(),
        headteacher_name: headteacherName.trim(),
        headteacher_signature: headteacherSignature.trim(),
        session_date: sessionDate,
      });

      // Notify all users about the submitted assessment
      const notifTitle = 'Supervision Assessment Submitted';
      const notifBody = `${appUser.name} assessed ${selectedSchool?.school_name ?? 'a school'} using ${tool.name} (${tool.department}) — Score: ${totalScore}/100`;
      createNotification({
        type: 'system',
        title: notifTitle,
        body: notifBody,
        target_all: true,
        created_by: appUser.id,
      }).catch(() => {});
      sendPush({ title: notifTitle, body: notifBody, target_all: true }).catch(() => {});

      router.push(`/supervision/sessions/${sessionId}`);
    } catch (err) {
      console.error(err);
      setError('Failed to submit assessment. Please try again.');
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
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg bg-gray-100 p-2 text-gray-600 active:bg-gray-200">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{tool.name}</h1>
          <p className="text-xs text-gray-500">{tool.department} Department</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* School + Date */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">School Details</h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">School *</label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
              required
            >
              <option value="">Select school…</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.school_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Areas */}
        {tool.areas.map((area, idx) => {
          const score = areaScores.find((a) => a.area_id === area.id);
          const scoreErr = scoreErrors[area.id];
          return (
            <div key={area.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Area Header */}
              <div className="flex items-center justify-between bg-gray-700 px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-white truncate">{area.name}</h3>
                </div>
                <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
                  /{area.expected_score}
                </span>
              </div>

              <div className="p-4 space-y-3">
                {/* Attributes Checklist */}
                {area.attributes.length > 0 && area.attributes.some((a) => a.trim()) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Guidance Checklist</p>
                    <div className="space-y-1.5">
                      {area.attributes
                        .filter((a) => a.trim())
                        .map((attr, aIdx) => (
                          <label key={aIdx} className="flex items-start gap-2 text-sm text-gray-700">
                            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-800 focus:ring-red-800" />
                            <span>{attr}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                {/* Observation */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Observation</label>
                  <textarea
                    value={score?.observation ?? ''}
                    onChange={(e) => updateAreaScore(area.id, 'observation', e.target.value)}
                    placeholder="Enter your observation for this area…"
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Score Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Actual Score (max {area.expected_score})
                  </label>
                  <input
                    type="number"
                    value={score?.actual_score || ''}
                    onChange={(e) => updateAreaScore(area.id, 'actual_score', e.target.value)}
                    min={0}
                    max={area.expected_score}
                    placeholder="0"
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${
                      scoreErr ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-amber-500'
                    }`}
                  />
                  {scoreErr && (
                    <p className="mt-1 text-xs text-red-600">{scoreErr}</p>
                  )}
                </div>

                {/* Score bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gray-500 transition-all"
                      style={{ width: `${Math.min(100, ((score?.actual_score ?? 0) / area.expected_score) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-600">
                    {score?.actual_score ?? 0}/{area.expected_score}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Sticky Total */}
        <div className="sticky bottom-20 z-10">
          <div className={`rounded-xl border-2 p-3 text-center font-bold text-lg shadow-lg ${
            totalScore >= 80
              ? 'border-green-300 bg-green-50/60 text-green-700'
              : totalScore >= 50
              ? 'border-amber-300 bg-amber-50/60 text-amber-700'
              : 'border-gray-300 bg-gray-50 text-gray-700'
          }`}>
            Total Score: {totalScore} / 100
          </div>
        </div>

        {/* Final Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Final Comments & Signatures</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Key Strengths to Maintain</label>
            <textarea
              value={keyStrengths}
              onChange={(e) => setKeyStrengths(e.target.value)}
              placeholder="List the key strengths observed…"
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Key Areas for Improvement</label>
            <textarea
              value={keyImprovements}
              onChange={(e) => setKeyImprovements(e.target.value)}
              placeholder="List areas that need improvement…"
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Supervisor Name / Signature</label>
              <input
                type="text"
                value={supervisorSignature}
                onChange={(e) => setSupervisorSignature(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Headteacher Name</label>
              <input
                type="text"
                value={headteacherName}
                onChange={(e) => setHeadteacherName(e.target.value)}
                placeholder="Name of headteacher"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Headteacher Signature</label>
            <input
              type="text"
              value={headteacherSignature}
              onChange={(e) => setHeadteacherSignature(e.target.value)}
              placeholder="Headteacher signature / acknowledgement"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !schoolId}
          className="w-full rounded-xl bg-gray-800 py-3.5 text-base font-bold text-white shadow-sm disabled:opacity-50 active:bg-gray-900"
        >
          {submitting ? 'Submitting…' : 'Submit Assessment'}
        </button>
      </form>
    </div>
  );
}

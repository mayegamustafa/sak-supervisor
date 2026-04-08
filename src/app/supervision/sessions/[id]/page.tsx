'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getSupervisionSession } from '@/lib/firestore-supervision';
import type { SupervisionSession } from '@/types';

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-red-700';
}

export default function SessionReportPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SupervisionSession | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser || !sessionId) return;
    getSupervisionSession(sessionId)
      .then((s) => {
        if (!s) {
          router.replace('/supervision/sessions');
          return;
        }
        setSession(s);
      })
      .finally(() => setFetching(false));
  }, [appUser, sessionId, router]);

  if (loading || !appUser || fetching)
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="spinner" />
      </div>
    );

  if (!session) return null;

  return (
    <div className="pb-6">
      {/* Action Bar (hidden in print) */}
      <div className="mb-5 flex items-center gap-2 print:hidden">
        <button onClick={() => router.back()} className="rounded-lg bg-gray-100 p-2 text-gray-600 active:bg-gray-200">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-lg font-bold text-gray-900 truncate">Assessment Report</h1>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white shadow-sm active:bg-red-900"
        >
          Print
        </button>
      </div>

      {/* Printable Report */}
      <div className="supervision-report space-y-4">
        {/* Report Header */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm print:border-2 print:border-gray-400 print:shadow-none">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-red-900 print:text-black">
              SAK / CPS Schools Supervision System
            </h2>
            <p className="text-sm text-gray-500 mt-1">Routine Supervision Assessment Report</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="font-semibold text-gray-600">School:</span>{' '}
              <span className="text-gray-900">{session.school_name}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Date:</span>{' '}
              <span className="text-gray-900">{new Date(session.session_date).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Department:</span>{' '}
              <span className="text-gray-900">{session.department}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Tool:</span>{' '}
              <span className="text-gray-900">{session.tool_name}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Supervisor:</span>{' '}
              <span className="text-gray-900">{session.supervisor_name}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Total Score:</span>{' '}
              <span className={`font-bold ${scoreColor(session.total_score)}`}>
                {session.total_score}/100
              </span>
            </div>
          </div>
        </div>

        {/* Areas Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden print:border-2 print:border-gray-400 print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-900 text-white print:bg-gray-800">
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide">Area</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide">Attributes</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide">Observation</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide">Expected</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide">Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {session.area_scores.map((area, idx) => {
                  // Find matching tool area for attributes (stored in the session tool reference)
                  return (
                    <tr key={area.area_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-3 text-gray-500 font-medium">{idx + 1}</td>
                      <td className="px-3 py-3 font-semibold text-gray-900 min-w-[120px]">{area.area_name}</td>
                      <td className="px-3 py-3 text-gray-600 min-w-[150px]">
                        {area.attributes && area.attributes.length > 0 ? (
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                            {area.attributes.map((attr, aIdx) => (
                              <li key={aIdx}>{attr}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-700 min-w-[150px]">
                        {area.observation || <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-gray-600">{area.expected_score}</td>
                      <td className={`px-3 py-3 text-center font-bold ${
                        area.actual_score >= area.expected_score * 0.8
                          ? 'text-green-700'
                          : area.actual_score >= area.expected_score * 0.5
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}>
                        {area.actual_score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold print:bg-gray-200">
                  <td colSpan={4} className="px-3 py-2.5 text-right uppercase text-gray-800">
                    Total Score
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-600">100</td>
                  <td className={`px-3 py-2.5 text-center text-lg ${scoreColor(session.total_score)}`}>
                    {session.total_score}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Comments */}
        {(session.key_strengths || session.key_improvements) && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 print:border-2 print:border-gray-400 print:shadow-none">
            {session.key_strengths && (
              <div>
                <h3 className="text-sm font-bold text-green-800 mb-1">Key Strengths to Maintain</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{session.key_strengths}</p>
              </div>
            )}
            {session.key_improvements && (
              <div>
                <h3 className="text-sm font-bold text-amber-800 mb-1">Key Areas for Improvement</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{session.key_improvements}</p>
              </div>
            )}
          </div>
        )}

        {/* Signatures */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:border-2 print:border-gray-400 print:shadow-none">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Signatures</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-t-2 border-gray-300 pt-2">
              <p className="text-sm font-semibold text-gray-900">{session.supervisor_signature || session.supervisor_name}</p>
              <p className="text-xs text-gray-500">Supervisor</p>
            </div>
            <div className="border-t-2 border-gray-300 pt-2">
              <p className="text-sm font-semibold text-gray-900">{session.headteacher_signature || session.headteacher_name || '—'}</p>
              <p className="text-xs text-gray-500">Headteacher</p>
            </div>
          </div>
          <div className="mt-3 text-right">
            <p className="text-xs text-gray-500">
              Date: {new Date(session.session_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

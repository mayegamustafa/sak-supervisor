'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getSupervisionTool } from '@/lib/firestore-supervision';
import type { SupervisionTool } from '@/types';

export default function PrintToolPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const toolId = params.id as string;

  const [tool, setTool] = useState<SupervisionTool | null>(null);
  const [fetching, setFetching] = useState(true);

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
        setTool(t);
      })
      .finally(() => setFetching(false));
  }, [appUser, toolId, router]);

  if (loading || !appUser || fetching)
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="spinner" />
      </div>
    );

  if (!tool) return null;

  return (
    <div className="pb-6">
      {/* Action Bar */}
      <div className="mb-5 flex items-center gap-2 print:hidden">
        <button onClick={() => router.back()} className="rounded-lg bg-gray-100 p-2 text-gray-600 active:bg-gray-200">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-lg font-bold text-gray-900 truncate">Print Blank Form</h1>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white shadow-sm active:bg-red-900"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Printable Blank Form */}
      <div className="supervision-report space-y-4">
        {/* Header */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm print:border-2 print:border-gray-400 print:shadow-none">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-red-900 print:text-black">
              SIR APOLLO KAGGWA SCHOOL &mdash; SINCE 1996
            </h2>
            <p className="text-sm font-semibold text-gray-700 mt-1">{tool.name}</p>
            <p className="text-xs text-gray-500">{tool.department} Department</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mt-4">
            <div className="flex items-end gap-1">
              <span className="font-semibold text-gray-600 shrink-0">School:</span>
              <span className="flex-1 border-b border-gray-400 min-h-[1.5rem]">&nbsp;</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="font-semibold text-gray-600 shrink-0">Date:</span>
              <span className="flex-1 border-b border-gray-400 min-h-[1.5rem]">&nbsp;</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="font-semibold text-gray-600 shrink-0">Supervisor:</span>
              <span className="flex-1 border-b border-gray-400 min-h-[1.5rem]">&nbsp;</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="font-semibold text-gray-600 shrink-0">Department:</span>
              <span className="flex-1 border-b border-gray-400 min-h-[1.5rem]">{tool.department}</span>
            </div>
          </div>
        </div>

        {/* Areas Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden print:border-2 print:border-gray-400 print:shadow-none">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-900 text-white print:bg-gray-800">
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide w-8">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide">Area</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide">Attributes / Checklist</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide" style={{ minWidth: 120 }}>Observation</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide w-16">Expected</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide w-16">Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tool.areas.map((area, idx) => (
                <tr key={area.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-3 text-gray-500 font-medium align-top">{idx + 1}</td>
                  <td className="px-3 py-3 font-semibold text-gray-900 align-top min-w-[100px]">
                    {area.name}
                  </td>
                  <td className="px-3 py-3 text-gray-600 align-top min-w-[150px]">
                    {area.attributes.filter((a) => a.trim()).length > 0 ? (
                      <ul className="space-y-1 text-xs">
                        {area.attributes
                          .filter((a) => a.trim())
                          .map((attr, aIdx) => (
                            <li key={aIdx} className="flex items-start gap-1.5">
                              <span className="inline-block h-3.5 w-3.5 shrink-0 border border-gray-400 rounded-sm mt-0.5 print:border-gray-600" />
                              <span>{attr}</span>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top" style={{ minHeight: 60 }}>
                    {/* Empty space for handwritten observation */}
                    <div className="min-h-[40px] border-b border-dashed border-gray-300 print:border-gray-400" />
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-gray-600 align-top">
                    {area.expected_score}
                  </td>
                  <td className="px-3 py-3 text-center align-top">
                    {/* Empty box for handwritten score */}
                    <div className="mx-auto h-8 w-12 border border-gray-400 rounded print:border-gray-600" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold print:bg-gray-200">
                <td colSpan={4} className="px-3 py-2.5 text-right uppercase text-gray-800">
                  Total Score
                </td>
                <td className="px-3 py-2.5 text-center text-gray-600">100</td>
                <td className="px-3 py-2.5 text-center">
                  <div className="mx-auto h-8 w-12 border-2 border-gray-500 rounded print:border-gray-700" />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Comments Section (blank lines) */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4 print:border-2 print:border-gray-400 print:shadow-none">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Key Strengths to Maintain</h3>
            <div className="space-y-3">
              <div className="border-b border-gray-300 min-h-[1.2rem] print:border-gray-400" />
              <div className="border-b border-gray-300 min-h-[1.2rem] print:border-gray-400" />
              <div className="border-b border-gray-300 min-h-[1.2rem] print:border-gray-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Key Areas for Improvement</h3>
            <div className="space-y-3">
              <div className="border-b border-gray-300 min-h-[1.2rem] print:border-gray-400" />
              <div className="border-b border-gray-300 min-h-[1.2rem] print:border-gray-400" />
              <div className="border-b border-gray-300 min-h-[1.2rem] print:border-gray-400" />
            </div>
          </div>
        </div>

        {/* Signatures Section (blank lines) */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:border-2 print:border-gray-400 print:shadow-none">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Signatures</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-6">Supervisor Name & Signature</p>
              <div className="border-b-2 border-gray-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-6">Headteacher Name & Signature</p>
              <div className="border-b-2 border-gray-400" />
            </div>
          </div>
          <div className="mt-4 flex items-end gap-1">
            <span className="text-xs font-semibold text-gray-600 shrink-0">Date:</span>
            <span className="flex-1 border-b border-gray-400 min-h-[1.2rem] max-w-[200px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

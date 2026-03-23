'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllIssues, getAllResolutions } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import type { Issue, Resolution } from '@/types';

export default function ReportPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    Promise.all([getAllIssues(), getAllResolutions()]).then(([allIssues, allResolutions]) => {
      const filtered =
        appUser.role === 'admin'
          ? allIssues
          : allIssues.filter((i) => i.created_by === appUser.name);
      setIssues(filtered);
      const map: Record<string, Resolution> = {};
      allResolutions.forEach((r) => { map[r.issue_id] = r; });
      setResolutions(map);
      setFetching(false);
    });
  }, [appUser]);

  if (loading || fetching || !appUser) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const pending = issues.filter((i) => i.status === 'Pending').length;
  const inProgress = issues.filter((i) => i.status === 'In Progress').length;
  const resolved = issues.filter((i) => i.status === 'Resolved').length;

  return (
    <>
      <style>{`
        @media print {
          body { font-size: 10pt; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>

      <div className="min-h-dvh bg-white px-4 py-6 pb-24 sm:px-10">
        {/* Toolbar — hidden on print */}
        <div className="no-print mb-6 flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700"
          >
            Print / Save PDF
          </button>
        </div>

        {/* ── Report Header ── */}
        <div className="mb-6 border-b-2 border-gray-900 pb-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Schools Supervision System
          </p>
          <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-gray-900">
            SAK / CPS Schools
          </h1>
          <h2 className="mt-0.5 text-base font-bold text-gray-700">Issues &amp; Supervision Report</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-500">
            <span>Date Generated: <strong>{today}</strong></span>
            <span>Prepared By: <strong>{appUser.name}</strong></span>
            <span className="capitalize">Role: <strong>{appUser.role}</strong></span>
          </div>
          {appUser.role !== 'admin' && (
            <p className="mt-1 text-xs text-gray-400">
              Showing issues submitted by {appUser.name}
            </p>
          )}
        </div>

        {/* ── Summary row ── */}
        <div className="no-print mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 text-center text-xs font-semibold">
          <div className="rounded-xl bg-gray-100 py-3">
            <p className="text-2xl font-bold text-gray-800">{issues.length}</p>
            <p className="text-gray-500">Total</p>
          </div>
          <div className="rounded-xl bg-red-50 py-3">
            <p className="text-2xl font-bold text-red-700">{pending}</p>
            <p className="text-red-500">Pending</p>
          </div>
          <div className="rounded-xl bg-yellow-50 py-3">
            <p className="text-2xl font-bold text-yellow-800">{inProgress}</p>
            <p className="text-yellow-600">In Progress</p>
          </div>
          <div className="rounded-xl bg-green-50 py-3">
            <p className="text-2xl font-bold text-green-700">{resolved}</p>
            <p className="text-green-500">Resolved</p>
          </div>
        </div>

        {/* ── Table ── */}
        {issues.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">No issues to display.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="border border-gray-600 px-2 py-2 text-center font-semibold">#</th>
                  <th className="border border-gray-600 px-2 py-2 text-left font-semibold">Date</th>
                  <th className="border border-gray-600 px-2 py-2 text-left font-semibold">School</th>
                  <th className="border border-gray-600 px-2 py-2 text-left font-semibold">Class</th>
                  <th className="border border-gray-600 px-2 py-2 text-left font-semibold">Issue / Title</th>
                  <th className="border border-gray-600 px-2 py-2 text-left font-semibold">Details</th>
                  <th className="border border-gray-600 px-2 py-2 text-left font-semibold">Category</th>
                  <th className="border border-gray-600 px-2 py-2 text-center font-semibold">Status</th>
                  <th className="border border-gray-600 px-2 py-2 text-left font-semibold">
                    Action Taken / Resolution
                  </th>
                  <th className="border border-gray-600 px-2 py-2 text-left font-semibold">
                    Submitted By
                  </th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, idx) => {
                  const res = resolutions[issue.id];
                  return (
                    <tr key={issue.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-2 py-2 text-center text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 whitespace-nowrap text-gray-700">
                        {new Date(issue.created_at).toLocaleDateString()}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 font-medium text-gray-900">
                        {issue.school_name}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-gray-600">
                        {issue.class_section || '—'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 font-semibold text-gray-900">
                        {issue.issue_title}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-gray-700" style={{ maxWidth: '200px' }}>
                        {issue.description}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-gray-600">
                        {issue.category}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
                            issue.status === 'Resolved'
                              ? 'bg-green-100 text-green-800'
                              : issue.status === 'In Progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-gray-700">
                        {res ? res.resolution_description : '—'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-gray-600">
                        {issue.created_by}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold text-gray-700">
                  <td colSpan={10} className="border border-gray-300 px-3 py-2">
                    Total: {issues.length} &nbsp;·&nbsp; Pending: {pending} &nbsp;·&nbsp; In
                    Progress: {inProgress} &nbsp;·&nbsp; Resolved: {resolved}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-8 flex items-center justify-between border-t pt-4 text-xs text-gray-400">
          <span>SAK Schools Supervision System · Confidential</span>
          <span>Generated on {today}</span>
        </div>
      </div>
    </>
  );
}

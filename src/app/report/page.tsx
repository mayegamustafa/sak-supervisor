'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllIssues, getAllResolutions, getAllTermConfigs } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import type { Issue, Resolution, TermConfig } from '@/types';

/* ── helpers ── */
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}-${d.getMonth() + 1}-${String(d.getFullYear()).slice(-2)}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type FilterMode = 'all' | 'term' | 'year' | 'date';

export default function ReportPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [terms, setTerms] = useState<TermConfig[]>([]);
  const [fetching, setFetching] = useState(true);

  /* filter state */
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Issue['status']>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'issue' | 'strength'>('all');

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    Promise.all([getAllIssues(), getAllResolutions(), getAllTermConfigs()]).then(
      ([issues, res, tc]) => {
        const filtered =
          appUser.role === 'admin'
            ? issues
            : issues.filter((i) => i.created_by === appUser.name);
        setAllIssues(filtered);
        const map: Record<string, Resolution> = {};
        res.forEach((r) => { map[r.issue_id] = r; });
        setResolutions(map);
        setTerms(tc);
        setFetching(false);
      }
    );
  }, [appUser]);

  /* derive available years from issues */
  const availableYears = useMemo(() => {
    const years = new Set(allIssues.map((i) => new Date(i.created_at).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [allIssues]);

  /* filtered issues */
  const issues = useMemo(() => {
    let list = allIssues;

    if (filterMode === 'term' && selectedTerm) {
      const tc = terms.find((t) => t.id === selectedTerm);
      if (tc) {
        const start = startOfDay(new Date(tc.start_date));
        const end = new Date(new Date(tc.end_date).getTime() + 86400000);
        list = list.filter((i) => {
          const d = new Date(i.created_at);
          return d >= start && d < end;
        });
      }
    } else if (filterMode === 'year' && selectedYear) {
      const y = Number(selectedYear);
      list = list.filter((i) => new Date(i.created_at).getFullYear() === y);
    } else if (filterMode === 'date') {
      if (dateFrom) {
        const from = startOfDay(new Date(dateFrom));
        list = list.filter((i) => new Date(i.created_at) >= from);
      }
      if (dateTo) {
        const to = new Date(new Date(dateTo).getTime() + 86400000);
        list = list.filter((i) => new Date(i.created_at) < to);
      }
    }

    if (statusFilter !== 'all') {
      list = list.filter((i) => i.status === statusFilter);
    }

    if (typeFilter === 'issue') {
      list = list.filter((i) => !i.submission_type || i.submission_type === 'issue');
    } else if (typeFilter === 'strength') {
      list = list.filter((i) => i.submission_type === 'strength');
    }

    return list;
  }, [allIssues, filterMode, selectedTerm, selectedYear, dateFrom, dateTo, statusFilter, typeFilter, terms]);

  const pending = issues.filter((i) => i.status === 'Pending').length;
  const inProgress = issues.filter((i) => i.status === 'In Progress').length;
  const resolved = issues.filter((i) => i.status === 'Resolved').length;

  /* filter description for print header */
  const filterLabel = useMemo(() => {
    if (filterMode === 'term' && selectedTerm) {
      const tc = terms.find((t) => t.id === selectedTerm);
      return tc ? `${tc.term} ${tc.year} (${fmtDate(tc.start_date)} – ${fmtDate(tc.end_date)})` : 'All Issues';
    }
    if (filterMode === 'year' && selectedYear) return `Year ${selectedYear}`;
    if (filterMode === 'date' && (dateFrom || dateTo)) {
      const f = dateFrom ? fmtDate(dateFrom) : '...';
      const t = dateTo ? fmtDate(dateTo) : '...';
      return `${f}  to  ${t}`;
    }
    return 'All Issues';
  }, [filterMode, selectedTerm, selectedYear, dateFrom, dateTo, terms]);

  if (loading || fetching || !appUser) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-800 border-t-transparent" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  /* ── WhatsApp share ── */
  const shareToWhatsApp = useCallback(() => {
    // Group issues by school
    const bySchool: Record<string, Issue[]> = {};
    issues.forEach((i) => {
      if (!bySchool[i.school_name]) bySchool[i.school_name] = [];
      bySchool[i.school_name].push(i);
    });

    let text = `📋 *SAK / CPS Schools Supervision Report*\n`;
    text += `📅 ${filterLabel}\n`;
    text += `👤 Prepared by: ${appUser.name}\n`;
    text += `📊 Total: ${issues.length} | Pending: ${pending} | In Progress: ${inProgress} | Resolved: ${resolved}\n`;
    text += `─────────────────\n\n`;

    Object.entries(bySchool).forEach(([school, schoolIssues]) => {
      text += `🏫 *${school}* (${schoolIssues.length} submissions)\n`;
      schoolIssues.forEach((i) => {
        const typeIcon = i.submission_type === 'strength' ? '⭐' : '⚠️';
        const statusIcon = i.status === 'Resolved' ? '✅' : i.status === 'In Progress' ? '🔄' : '🔴';
        text += `${typeIcon}${statusIcon} ${i.issue_title}`;
        if (i.description) text += `\n   _${i.description.slice(0, 150)}${i.description.length > 150 ? '...' : ''}_`;
        const res = resolutions[i.id];
        if (res) text += `\n   ✔️ Action: ${res.resolution_description.slice(0, 120)}`;
        text += '\n';
      });
      text += '\n';
    });

    text += `─────────────────\n`;
    text += `_SAK Schools Supervision System · ${today}_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }, [issues, resolutions, filterLabel, appUser, pending, inProgress, resolved, today]);

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 10mm; }
          html, body { margin: 0; padding: 0; font-size: 9pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-container { padding: 0 !important; }
          table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          td, th { word-wrap: break-word; overflow-wrap: break-word; white-space: normal !important; padding: 4px 6px !important; font-size: 8pt; }
          .report-header { page-break-after: avoid; }
          .report-footer { page-break-before: avoid; }
        }
      `}</style>

      <div className="print-container min-h-dvh bg-white px-4 py-6 pb-24 sm:px-10">
        {/* ── Toolbar ── */}
        <div className="no-print mb-4 flex items-center justify-between gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm font-medium text-red-800 hover:underline">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div className="flex gap-2">
            <button onClick={shareToWhatsApp} className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-[#1da851] transition-all">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Share
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-800 to-red-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:from-red-900 hover:to-red-950 transition-all">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
          </div>
        </div>

        {/* ── Filters (bank-statement style) ── */}
        <div className="no-print mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-bold text-red-900">Filter Report</h3>

          {/* Mode tabs */}
          <div className="flex flex-wrap gap-2">
            {([['all', 'All'], ['term', 'By Term'], ['year', 'By Year'], ['date', 'Date Range']] as const).map(([m, l]) => (
              <button key={m} onClick={() => setFilterMode(m)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  filterMode === m ? 'bg-gradient-to-r from-red-800 to-red-900 text-white shadow-sm' : 'bg-white border border-gray-300 text-gray-700 hover:bg-red-50'
                }`}>
                {l}
              </button>
            ))}
          </div>

          {/* Conditional controls */}
          <div className="flex flex-wrap items-end gap-3">
            {filterMode === 'term' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Term</label>
                <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                  <option value="">— Choose term —</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>{t.term} {t.year} ({fmtDate(t.start_date)} – {fmtDate(t.end_date)})</option>
                  ))}
                </select>
              </div>
            )}

            {filterMode === 'year' && (
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Year</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                  <option value="">— Choose year —</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {filterMode === 'date' && (
              <>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                </div>
              </>
            )}

            {/* Status filter (always visible) */}
            <div className="min-w-[130px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            {/* Type filter */}
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                <option value="all">All Types</option>
                <option value="issue">Issues / Problems</option>
                <option value="strength">Strengths / Achievements</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Showing <strong>{issues.length}</strong> of {allIssues.length} submissions
            {statusFilter !== 'all' && <> · Status: <strong>{statusFilter}</strong></>}
            {typeFilter !== 'all' && <> · Type: <strong>{typeFilter === 'issue' ? 'Issues' : 'Strengths'}</strong></>}
          </p>
        </div>

        {/* ── Report Header ── */}
        <div className="report-header mb-5 border-b-2 border-red-900 pb-5 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-4">
            <img src="/badges/sak.jpg" alt="SAK Badge" className="h-16 w-16 rounded-full object-cover shadow ring-2 ring-red-200" />
            <img src="/badges/cps.png" alt="CPS Badge" className="h-16 w-16 rounded-full bg-white object-cover shadow ring-2 ring-red-200" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-red-800">Schools Supervision System</p>
          <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-red-950">SAK / CPS Schools</h1>
          <h2 className="mt-0.5 text-base font-bold text-amber-700">Supervision Report — Issues &amp; Strengths</h2>
          <p className="mt-1 text-sm font-medium text-gray-600">Period: {filterLabel}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-500">
            <span>Date Generated: <strong>{today}</strong></span>
            <span>Prepared By: <strong>{appUser.name}</strong></span>
            <span className="capitalize">Role: <strong>{appUser.role}</strong></span>
          </div>
          {appUser.role !== 'admin' && (
            <p className="mt-1 text-xs text-amber-600">Showing issues submitted by {appUser.name}</p>
          )}
        </div>

        {/* ── Table ── */}
        {issues.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">No issues to display for the selected period.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full border-collapse text-[11px] leading-snug">
              <thead>
                <tr className="bg-gradient-to-r from-red-900 to-red-800 text-white">
                  <th className="border border-red-700 px-1.5 py-2 text-center font-semibold">#</th>
                  <th className="border border-red-700 px-1.5 py-2 text-left font-semibold">Date</th>
                  <th className="border border-red-700 px-1.5 py-2 text-left font-semibold">Type</th>
                  <th className="border border-red-700 px-1.5 py-2 text-left font-semibold">School</th>
                  <th className="border border-red-700 px-1.5 py-2 text-left font-semibold">Class</th>
                  <th className="border border-red-700 px-1.5 py-2 text-left font-semibold">Title</th>
                  <th className="border border-red-700 px-2 py-2 text-left font-semibold">Details</th>
                  <th className="border border-red-700 px-1.5 py-2 text-left font-semibold">Category</th>
                  <th className="border border-red-700 px-1.5 py-2 text-center font-semibold">Status</th>
                  <th className="border border-red-700 px-1.5 py-2 text-left font-semibold">Action Taken</th>
                  <th className="border border-red-700 px-1.5 py-2 text-left font-semibold">By</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, idx) => {
                  const res = resolutions[issue.id];
                  const isStrength = issue.submission_type === 'strength';
                  return (
                    <tr key={issue.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/40'}>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-center text-gray-400">{idx + 1}</td>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-gray-700">{fmtDate(issue.created_at)}</td>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-center">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          isStrength ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isStrength ? '⭐ Strength' : '⚠️ Issue'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-1.5 py-1.5 font-medium text-gray-900">{issue.school_name}</td>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-gray-600">{issue.class_section || '—'}</td>
                      <td className="border border-gray-300 px-1.5 py-1.5 font-semibold text-gray-900">{issue.issue_title}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-gray-700" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {issue.description}
                      </td>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-gray-600">{issue.category}</td>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-center">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          issue.status === 'Resolved' ? 'bg-green-100 text-green-800'
                          : issue.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                        }`}>{issue.status}</span>
                      </td>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-gray-700" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {res ? res.resolution_description : '—'}
                      </td>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-gray-600">{issue.created_by}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-red-50 font-semibold text-red-900">
                  <td colSpan={11} className="border border-gray-300 px-3 py-2 text-xs">
                    Total: {issues.length} &nbsp;·&nbsp; Pending: {pending} &nbsp;·&nbsp; In Progress: {inProgress} &nbsp;·&nbsp; Resolved: {resolved}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="report-footer mt-8 flex items-center justify-between border-t-2 border-red-900 pt-4 text-xs text-gray-500">
          <span className="font-medium text-red-800">SAK Schools Supervision System · Confidential</span>
          <span>Generated on {today}</span>
        </div>
      </div>
    </>
  );
}

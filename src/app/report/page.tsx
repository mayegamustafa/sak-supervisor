'use client';

import { useEffect, useState, useMemo } from 'react';
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
  const [exporting, setExporting] = useState(false);

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

  /* ── PDF export / share ── */
  async function handlePdf(mode: 'save' | 'share') {
    if (!appUser || exporting) return;
    setExporting(true);
    try {
      const { buildIssuesReportPdf, savePdf, sharePdf } = await import('@/lib/pdf');
      const doc = await buildIssuesReportPdf({
        issues,
        resolutions,
        filterLabel,
        preparedBy: appUser.name,
        counts: { pending, inProgress, resolved },
      });
      const filename = `SAK-Supervision-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
      if (mode === 'share') {
        await sharePdf(doc, filename);
      } else {
        const msg = await savePdf(doc, filename);
        if (msg) alert(msg);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => handlePdf('share')} disabled={exporting}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-[#1da851] transition-all disabled:opacity-60">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg>
              Share PDF
            </button>
            <button onClick={() => handlePdf('save')} disabled={exporting}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-red-800 to-red-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:from-red-900 hover:to-red-950 transition-all disabled:opacity-60">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              {exporting ? 'Preparing…' : 'Save PDF'}
            </button>
            <button onClick={() => window.print()}
              className="hidden sm:inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all">
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
                          {isStrength ? 'Strength' : 'Issue'}
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

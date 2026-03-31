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

    return list;
  }, [allIssues, filterMode, selectedTerm, selectedYear, dateFrom, dateTo, statusFilter, terms]);

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <>
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { font-size: 8pt; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          table { page-break-inside: auto; border-collapse: collapse; width: 100%; table-layout: fixed; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .col-no   { width: 3%; }
          .col-date { width: 6%; }
          .col-school { width: 10%; }
          .col-class { width: 7%; }
          .col-title { width: 11%; }
          .col-details { width: 26%; }
          .col-cat  { width: 7%; }
          .col-status { width: 6%; }
          .col-action { width: 16%; }
          .col-by   { width: 8%; }
          td, th { word-wrap: break-word; overflow-wrap: break-word; }
        }
      `}</style>

      <div className="min-h-dvh bg-white px-4 py-6 pb-24 sm:px-10">
        {/* ── Toolbar ── */}
        <div className="no-print mb-4 flex items-center justify-between gap-4">
          <button onClick={() => router.back()} className="text-sm font-medium text-blue-600 hover:underline">
            ← Back
          </button>
          <button onClick={() => window.print()} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700">
            Print / Save PDF
          </button>
        </div>

        {/* ── Filters (bank-statement style) ── */}
        <div className="no-print mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Filter Report</h3>

          {/* Mode tabs */}
          <div className="flex flex-wrap gap-2">
            {([['all', 'All'], ['term', 'By Term'], ['year', 'By Year'], ['date', 'Date Range']] as const).map(([m, l]) => (
              <button key={m} onClick={() => setFilterMode(m)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  filterMode === m ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
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
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </>
            )}

            {/* Status filter (always visible) */}
            <div className="min-w-[130px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Showing <strong>{issues.length}</strong> of {allIssues.length} issues
            {statusFilter !== 'all' && <> · Status: <strong>{statusFilter}</strong></>}
          </p>
        </div>

        {/* ── Report Header ── */}
        <div className="mb-5 border-b-2 border-gray-900 pb-5 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-4">
            <img src="/badges/sak.jpg" alt="SAK Badge" className="h-16 w-16 rounded-full object-cover shadow" />
            <img src="/badges/cps.png" alt="CPS Badge" className="h-16 w-16 rounded-full object-cover shadow" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Schools Supervision System</p>
          <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-gray-900">SAK / CPS Schools</h1>
          <h2 className="mt-0.5 text-base font-bold text-gray-700">Issues &amp; Supervision Report</h2>
          <p className="mt-1 text-sm font-medium text-gray-600">Period: {filterLabel}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-500">
            <span>Date Generated: <strong>{today}</strong></span>
            <span>Prepared By: <strong>{appUser.name}</strong></span>
            <span className="capitalize">Role: <strong>{appUser.role}</strong></span>
          </div>
          {appUser.role !== 'admin' && (
            <p className="mt-1 text-xs text-gray-400">Showing issues submitted by {appUser.name}</p>
          )}
        </div>

        {/* ── Table ── */}
        {issues.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">No issues to display for the selected period.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full border-collapse text-[11px] leading-snug" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="col-no border border-gray-600 px-1.5 py-2 text-center font-semibold">#</th>
                  <th className="col-date border border-gray-600 px-1.5 py-2 text-left font-semibold">Date</th>
                  <th className="col-school border border-gray-600 px-1.5 py-2 text-left font-semibold">School</th>
                  <th className="col-class border border-gray-600 px-1.5 py-2 text-left font-semibold">Class / Section</th>
                  <th className="col-title border border-gray-600 px-1.5 py-2 text-left font-semibold">Issue / Title</th>
                  <th className="col-details border border-gray-600 px-2 py-2 text-left font-semibold">Details</th>
                  <th className="col-cat border border-gray-600 px-1.5 py-2 text-left font-semibold">Category</th>
                  <th className="col-status border border-gray-600 px-1.5 py-2 text-center font-semibold">Status</th>
                  <th className="col-action border border-gray-600 px-1.5 py-2 text-left font-semibold">Action Taken</th>
                  <th className="col-by border border-gray-600 px-1.5 py-2 text-left font-semibold">Submitted By</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, idx) => {
                  const res = resolutions[issue.id];
                  return (
                    <tr key={issue.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-center text-gray-400">{idx + 1}</td>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-gray-700 whitespace-nowrap">{fmtDate(issue.created_at)}</td>
                      <td className="border border-gray-300 px-1.5 py-1.5 font-medium text-gray-900">{issue.school_name}</td>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-gray-600">{issue.class_section || '—'}</td>
                      <td className="border border-gray-300 px-1.5 py-1.5 font-semibold text-gray-900">{issue.issue_title}</td>
                      <td className="col-details border border-gray-300 px-2 py-1.5 text-gray-700" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
                <tr className="bg-gray-100 font-semibold text-gray-700">
                  <td colSpan={10} className="border border-gray-300 px-3 py-2 text-xs">
                    Total: {issues.length} &nbsp;·&nbsp; Pending: {pending} &nbsp;·&nbsp; In Progress: {inProgress} &nbsp;·&nbsp; Resolved: {resolved}
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

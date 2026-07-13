import type { jsPDF } from 'jspdf';
import type { Issue, Resolution, SupervisionSession, SupervisionTool } from '@/types';

/**
 * PDF generation + export for all system reports.
 *
 * - Page size: A4 (portrait or landscape), tight margins, auto-fitted tables.
 * - Font: Helvetica — the PDF core font metrically identical to Arial
 *   (real Arial is not embeddable without shipping the licensed TTF).
 * - Export: on the native app, writes the file and opens the Android/iOS
 *   share sheet (WhatsApp, Drive, "Save to Files", …). On the web it uses the
 *   Web Share API when available, else a normal download.
 */

const MARGIN = 12; // mm
const BRAND: [number, number, number] = [90, 10, 10]; // deep maroon

async function createDoc(orientation: 'portrait' | 'landscape'): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
  doc.setFont('helvetica', 'normal');
  return doc;
}

async function autoTable(doc: jsPDF, options: Record<string, unknown>) {
  const { default: autoTableFn } = await import('jspdf-autotable');
  autoTableFn(doc, options);
}

function pageWidth(doc: jsPDF) {
  return doc.internal.pageSize.getWidth();
}

/** Brand header block; returns the Y position content should continue at. */
function drawHeader(doc: jsPDF, title: string, subtitle: string, metaLines: string[]): number {
  const w = pageWidth(doc);
  let y = MARGIN + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND);
  doc.text('SIR APOLLO KAGGWA SCHOOLS — SINCE 1996', w / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(title, w / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(subtitle, w / 2, y, { align: 'center' });
  y += 5;
  for (const line of metaLines) {
    doc.text(line, w / 2, y, { align: 'center' });
    y += 4.5;
  }
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, w - MARGIN, y);
  return y + 4;
}

/** Page-number + generated-on footer on every page. */
function drawFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  const w = pageWidth(doc);
  const h = doc.internal.pageSize.getHeight();
  const generated = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130);
    doc.text('SAK Schools Supervision System · Confidential', MARGIN, h - 6);
    doc.text(`Generated ${generated} · Page ${i} of ${total}`, w - MARGIN, h - 6, { align: 'right' });
  }
}

const TABLE_BASE = {
  theme: 'grid' as const,
  styles: {
    font: 'helvetica',
    fontSize: 8,
    cellPadding: 1.6,
    textColor: [40, 40, 40] as [number, number, number],
    lineColor: [180, 180, 180] as [number, number, number],
    lineWidth: 0.15,
    overflow: 'linebreak' as const,
  },
  headStyles: {
    fillColor: BRAND,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 8,
  },
  alternateRowStyles: { fillColor: [250, 245, 245] as [number, number, number] },
  margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 14 },
};

// ─── Issues / strengths report (the /report page) ────────────────────────────

export async function buildIssuesReportPdf(params: {
  issues: Issue[];
  resolutions: Record<string, Resolution>;
  filterLabel: string;
  preparedBy: string;
  counts: { pending: number; inProgress: number; resolved: number };
}): Promise<jsPDF> {
  const { issues, resolutions, filterLabel, preparedBy, counts } = params;
  const doc = await createDoc('landscape');

  const startY = drawHeader(
    doc,
    'SAK / CPS Schools — Supervision Report (Issues & Strengths)',
    `Period: ${filterLabel}`,
    [`Prepared by: ${preparedBy} · Total: ${issues.length} · Pending: ${counts.pending} · In Progress: ${counts.inProgress} · Resolved: ${counts.resolved}`]
  );

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
  };

  await autoTable(doc, {
    ...TABLE_BASE,
    startY,
    head: [['#', 'Date', 'Type', 'School', 'Class', 'Title', 'Details', 'Category', 'Status', 'Action Taken', 'By']],
    body: issues.map((i, idx) => [
      idx + 1,
      fmt(i.created_at),
      i.submission_type === 'strength' ? 'Strength' : 'Issue',
      i.school_name,
      i.class_section || '—',
      i.issue_title,
      i.description,
      i.category,
      i.status,
      resolutions[i.id]?.resolution_description ?? '—',
      i.created_by,
    ]),
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: 30 },
      4: { cellWidth: 16 },
      5: { cellWidth: 36 },
      7: { cellWidth: 22 },
      8: { cellWidth: 19 },
      9: { cellWidth: 45 },
      10: { cellWidth: 22 },
    },
    foot: [[{
      content: `Total: ${issues.length}   ·   Pending: ${counts.pending}   ·   In Progress: ${counts.inProgress}   ·   Resolved: ${counts.resolved}`,
      colSpan: 11,
    }]],
    footStyles: { fillColor: [250, 235, 235] as [number, number, number], textColor: BRAND, fontStyle: 'bold' as const, fontSize: 8 },
  });

  drawFooters(doc);
  return doc;
}

// ─── Completed assessment report (supervision session) ───────────────────────

export async function buildSessionReportPdf(session: SupervisionSession): Promise<jsPDF> {
  const doc = await createDoc('portrait');

  const startY = drawHeader(
    doc,
    'Routine Supervision Assessment Report',
    `${session.tool_name} · ${session.department} Department`,
    [
      `School: ${session.school_name} · Date: ${new Date(session.session_date).toLocaleDateString('en-GB')}`,
      `Supervisor: ${session.supervisor_name} · Total Score: ${session.total_score}/100`,
    ]
  );

  await autoTable(doc, {
    ...TABLE_BASE,
    startY,
    head: [['#', 'Area', 'Attributes', 'Observation', 'Expected', 'Actual']],
    body: session.area_scores.map((a, idx) => [
      idx + 1,
      a.area_name,
      (a.attributes ?? []).filter(Boolean).map((t) => `• ${t}`).join('\n') || '—',
      a.observation || '—',
      a.expected_score,
      a.actual_score,
    ]),
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 50 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
    },
    foot: [[
      { content: 'TOTAL SCORE', colSpan: 4, styles: { halign: 'right' } },
      { content: '100', styles: { halign: 'center' } },
      { content: String(session.total_score), styles: { halign: 'center' } },
    ]],
    footStyles: { fillColor: [235, 235, 235] as [number, number, number], textColor: [30, 30, 30] as [number, number, number], fontStyle: 'bold' as const },
  });

  // Comments + signatures below the table
  type WithTable = jsPDF & { lastAutoTable?: { finalY: number } };
  let y = ((doc as WithTable).lastAutoTable?.finalY ?? startY) + 8;
  const w = pageWidth(doc);
  const h = doc.internal.pageSize.getHeight();

  const writeBlock = (heading: string, text: string) => {
    const lines = doc.splitTextToSize(text, w - MARGIN * 2);
    const needed = 6 + lines.length * 4.2;
    if (y + needed > h - 20) { doc.addPage(); y = MARGIN + 4; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...BRAND);
    doc.text(heading, MARGIN, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40);
    doc.text(lines, MARGIN, y); y += lines.length * 4.2 + 4;
  };

  if (session.key_strengths) writeBlock('Key Strengths to Maintain', session.key_strengths);
  if (session.key_improvements) writeBlock('Key Areas for Improvement', session.key_improvements);

  if (y + 26 > h - 20) { doc.addPage(); y = MARGIN + 4; }
  y += 6;
  const colW = (w - MARGIN * 2 - 10) / 2;
  doc.setDrawColor(120); doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 8, MARGIN + colW, y + 8);
  doc.line(MARGIN + colW + 10, y + 8, w - MARGIN, y + 8);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(40);
  doc.text(session.supervisor_signature || session.supervisor_name, MARGIN, y + 6);
  doc.text(session.headteacher_signature || session.headteacher_name || '—', MARGIN + colW + 10, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110);
  doc.text('Supervisor', MARGIN, y + 12.5);
  doc.text('Headteacher', MARGIN + colW + 10, y + 12.5);

  drawFooters(doc);
  return doc;
}

// ─── Blank assessment form (for hardcopy use) ────────────────────────────────

export async function buildBlankToolPdf(tool: SupervisionTool): Promise<jsPDF> {
  const doc = await createDoc('portrait');

  const startY = drawHeader(
    doc,
    tool.name,
    `${tool.department} Department · Routine Supervision Form`,
    ['School: ______________________________        Supervisor: ______________________________        Date: ______________']
  );

  await autoTable(doc, {
    ...TABLE_BASE,
    startY,
    head: [['#', 'Area', 'Attributes / Checklist', 'Observation', 'Expected', 'Actual']],
    body: tool.areas.map((a, idx) => [
      idx + 1,
      a.name,
      a.attributes.filter((t) => t.trim()).map((t) => `[  ]  ${t}`).join('\n') || '—',
      '', // handwriting space
      a.expected_score,
      '',
    ]),
    bodyStyles: { minCellHeight: 16 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 58 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
    },
    foot: [[
      { content: 'TOTAL SCORE', colSpan: 4, styles: { halign: 'right' } },
      { content: '100', styles: { halign: 'center' } },
      { content: '', styles: { halign: 'center' } },
    ]],
    footStyles: { fillColor: [235, 235, 235] as [number, number, number], textColor: [30, 30, 30] as [number, number, number], fontStyle: 'bold' as const },
  });

  type WithTable = jsPDF & { lastAutoTable?: { finalY: number } };
  let y = ((doc as WithTable).lastAutoTable?.finalY ?? startY) + 8;
  const w = pageWidth(doc);
  const h = doc.internal.pageSize.getHeight();

  const blankBlock = (heading: string) => {
    if (y + 24 > h - 20) { doc.addPage(); y = MARGIN + 4; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...BRAND);
    doc.text(heading, MARGIN, y); y += 7;
    doc.setDrawColor(150); doc.setLineWidth(0.2);
    for (let i = 0; i < 3; i++) { doc.line(MARGIN, y, w - MARGIN, y); y += 7; }
    y += 2;
  };

  blankBlock('Key Strengths to Maintain');
  blankBlock('Key Areas for Improvement');

  if (y + 26 > h - 20) { doc.addPage(); y = MARGIN + 4; }
  y += 4;
  const colW = (w - MARGIN * 2 - 10) / 2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(40);
  doc.text('Supervisor Name & Signature', MARGIN, y);
  doc.text('Headteacher Name & Signature', MARGIN + colW + 10, y);
  doc.setDrawColor(120); doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 10, MARGIN + colW, y + 10);
  doc.line(MARGIN + colW + 10, y + 10, w - MARGIN, y + 10);

  drawFooters(doc);
  return doc;
}

// ─── Export (save to device / share to other apps) ───────────────────────────

async function isNativeApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function writeNativeFile(doc: jsPDF, filename: string, directory: 'CACHE' | 'DOCUMENTS'): Promise<string> {
  const base64 = doc.output('datauristring').split(',')[1];
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const result = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: directory === 'CACHE' ? Directory.Cache : Directory.Documents,
  });
  return result.uri;
}

/** Open the share sheet with the PDF (WhatsApp, email, Drive, Save to Files…). */
export async function sharePdf(doc: jsPDF, filename: string): Promise<void> {
  if (await isNativeApp()) {
    const uri = await writeNativeFile(doc, filename, 'CACHE');
    const { Share } = await import('@capacitor/share');
    await Share.share({ title: filename, files: [uri] });
    return;
  }
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return; // user cancelled
    }
  }
  doc.save(filename); // fallback: download
}

/** Save the PDF to the device. Returns a human message for a toast/alert ('' = silent). */
export async function savePdf(doc: jsPDF, filename: string): Promise<string> {
  if (await isNativeApp()) {
    try {
      await writeNativeFile(doc, filename, 'DOCUMENTS');
      return `Saved to your Documents folder as ${filename}`;
    } catch {
      // Some Android versions restrict Documents — let the user pick a target.
      await sharePdf(doc, filename);
      return '';
    }
  }
  doc.save(filename);
  return '';
}

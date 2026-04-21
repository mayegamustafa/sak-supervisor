import Link from 'next/link';
import type { Issue } from '@/types';
import { ExclamationTriangleIcon, StarIcon } from '@/components/Icons';

const priorityColor: Record<Issue['priority'], string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
};

const issueStatusColor: Record<Issue['status'], string> = {
  Pending: 'bg-red-50 text-red-700 border-red-200',
  'In Progress': 'bg-yellow-50 text-yellow-800 border-yellow-200',
  Resolved: 'bg-green-50 text-green-700 border-green-200',
};

const strengthStatusColor: Record<Issue['status'], string> = {
  Pending: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'In Progress': 'bg-teal-50 text-teal-700 border-teal-200',
  Resolved: 'bg-green-50 text-green-700 border-green-200',
};

interface Props {
  issue: Issue;
}

export default function IssueCard({ issue }: Props) {
  const isStrength = issue.submission_type === 'strength';
  const statusColor = isStrength ? strengthStatusColor[issue.status] : issueStatusColor[issue.status];

  return (
    <Link href={`/issues/${issue.id}`}>
      <div className={`card-press rounded-xl border p-4 shadow-sm ${statusColor}`}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            {isStrength && (
              <StarIcon className="mt-0.5 shrink-0 h-4 w-4 text-green-600" />
            )}
            <h3 className="font-semibold leading-snug text-gray-900 line-clamp-2">
              {issue.issue_title}
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 truncate max-w-[100px]">
            {issue.created_by}
          </span>
        </div>

        <p className="mb-3 text-sm text-gray-600 line-clamp-2">{issue.description}</p>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          {isStrength ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 border border-green-200">
              <StarIcon className="h-3 w-3" /> Strength
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
              <ExclamationTriangleIcon className="h-3 w-3" /> Issue
            </span>
          )}
          <span className="rounded-full bg-white/60 px-2 py-0.5 border border-current">
            {issue.status}
          </span>
          <span className="rounded-full bg-white/40 px-2 py-0.5">{issue.category}</span>
          <span className="truncate max-w-[120px]">{issue.school_name}</span>
          <span className="ml-auto text-gray-400">{new Date(issue.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}

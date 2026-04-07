import type { Issue, FollowUp, Resolution } from '@/types';
import { DocumentTextIcon, ChatBubbleIcon, CheckCircleIcon, ClockIcon } from './Icons';

interface Props {
  issue: Issue;
  followups: FollowUp[];
  resolution: Resolution | null;
}

type IconComponent = React.ComponentType<{ className?: string }>;

function TimelineItem({
  Icon,
  dotColor,
  title,
  subtitle,
  date,
  children,
}: {
  Icon: IconComponent;
  dotColor: string;
  title: string;
  subtitle?: string;
  date?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${dotColor}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="w-0.5 flex-1 bg-gray-200" />
      </div>
      <div className="mb-6 flex-1 pb-1">
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {date && (
            <span className="text-xs text-gray-400">
              {new Date(date).toLocaleString()}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        {children && <div className="mt-1 text-sm text-gray-700">{children}</div>}
      </div>
    </div>
  );
}

export default function FollowUpTimeline({ issue, followups, resolution }: Props) {
  return (
    <div className="mt-4">
      <TimelineItem
        Icon={DocumentTextIcon}
        dotColor="bg-red-100 text-red-800"
        title="Issue Reported"
        subtitle={`By ${issue.created_by}`}
        date={issue.created_at}
      >
        <p className="line-clamp-3">{issue.description}</p>
      </TimelineItem>

      {followups.map((fu) => (
        <TimelineItem
          key={fu.id}
          Icon={ChatBubbleIcon}
          dotColor="bg-yellow-100 text-yellow-700"
          title="Follow-up Comment"
          subtitle={`By ${fu.created_by}`}
          date={fu.created_at}
        >
          {fu.comment}
        </TimelineItem>
      ))}

      {resolution && (
        <TimelineItem
          Icon={CheckCircleIcon}
          dotColor="bg-green-100 text-green-700"
          title="Issue Resolved"
          subtitle={`By ${resolution.resolved_by}`}
          date={resolution.resolved_at}
        >
          {resolution.resolution_description}
        </TimelineItem>
      )}

      {!resolution && issue.status !== 'Resolved' && (
        <div className="flex gap-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">
            <ClockIcon className="h-4 w-4" />
          </span>
          <div className="pb-2 pt-1 text-sm text-gray-500 italic">Awaiting resolution…</div>
        </div>
      )}
    </div>
  );
}


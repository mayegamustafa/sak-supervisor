'use client';

/** Visual pull-to-refresh indicator — place at the top of the refreshable container */
export default function PullIndicator({
  pullDistance,
  refreshing,
  threshold = 80,
}: {
  pullDistance: number;
  refreshing: boolean;
  threshold?: number;
}) {
  if (!refreshing && pullDistance <= 0) return null;
  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all"
      style={{ height: refreshing ? 48 : pullDistance }}
    >
      {refreshing ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-800 border-t-transparent" />
      ) : (
        <svg
          className="h-6 w-6 text-red-800 transition-transform"
          style={{ transform: `rotate(${progress * 180}deg)`, opacity: progress }}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
        </svg>
      )}
    </div>
  );
}

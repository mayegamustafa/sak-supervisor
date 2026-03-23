'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PullRefreshOptions {
  /** Function that re-fetches data. Should return a promise. */
  onRefresh: () => Promise<void>;
  /** Auto-refresh interval in ms (default: 30000 = 30s). Set 0 to disable. */
  autoRefreshInterval?: number;
  /** Minimum pull distance in px to trigger refresh (default: 80). */
  threshold?: number;
}

/**
 * Pull-to-refresh + auto-background refresh hook.
 *
 * Returns:
 * - `refreshing` – true while refreshing
 * - `pullDistance` – current pull distance (for animating indicator)
 * - `containerRef` – attach to the scrollable container
 */
export function usePullRefresh({
  onRefresh,
  autoRefreshInterval = 30_000,
  threshold = 80,
}: PullRefreshOptions) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);

  const doRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh, refreshing]);

  // Touch-based pull-to-refresh
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleTouchStart(e: TouchEvent) {
      // Only start tracking if scrolled to top
      if (window.scrollY <= 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        // Dampen the pull (50% of actual distance)
        setPullDistance(Math.min(dy * 0.5, threshold * 1.5));
      }
    }

    function handleTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= threshold) {
        doRefresh();
      } else {
        setPullDistance(0);
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, pullDistance, threshold, doRefresh]);

  // Auto-background refresh
  useEffect(() => {
    if (!autoRefreshInterval) return;
    const id = setInterval(() => {
      if (!document.hidden) doRefresh();
    }, autoRefreshInterval);
    return () => clearInterval(id);
  }, [autoRefreshInterval, doRefresh]);

  // Also refresh when page becomes visible again
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden) doRefresh();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [doRefresh]);

  return { refreshing, pullDistance, containerRef, doRefresh };
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Calculates elapsed execution time from a start timestamp.
 * Updates every second when `isRunning` is true.
 *
 * @param startedAt - ISO date string when work started (actualStart)
 * @param isRunning  - Whether the WO is currently in_progress (timer active)
 * @param pausedMs  - Optional: cumulative paused milliseconds to subtract
 * @returns formatted string HH:MM:SS
 */
export function useElapsedTime(
  startedAt: string | null | undefined,
  isRunning: boolean,
  pausedMs: number = 0,
): string {
  const [elapsed, setElapsed] = useState<string>('00:00:00');
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const compute = useCallback(() => {
    if (!startedAt) return '00:00:00';
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const raw = Math.max(0, now - start - pausedMs);
    const totalSec = Math.floor(raw / 1000);
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor((totalSec % 3600) / 60);
    const ss = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  }, [startedAt, pausedMs]);

  useEffect(() => {
    if (isRunning && startedAt) {
      // Compute immediately
      setElapsed(compute());
      // Then update every second
      rafRef.current = setInterval(() => {
        setElapsed(compute());
      }, 1000);
    } else {
      // Freeze at last computed value when paused/stopped
      setElapsed(compute());
    }
    return () => {
      if (rafRef.current) {
        clearInterval(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isRunning, startedAt, compute]);

  return elapsed;
}

export default useElapsedTime;

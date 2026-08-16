'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface TimeLogEntry {
  action: string;
  timestamp: string;
  startTime: string | null;
  endTime: string | null;
  duration?: number | null;
  pauseReason?: string | null;
}

export interface ElapsedResult {
  elapsed: string;
  activeMs: number;
  waitingMs: number;
  calendarMs: number;
}

/**
 * Calculate cumulative waiting/hold time from time logs.
 *
 * Pairs pause/hold entries with their corresponding resume entries.
 * If there is an unclosed pause (no matching resume), adds time from
 * that pause to `referenceNow`.
 */
export function calculateWaitingMs(
  timeLogs: TimeLogEntry[],
  referenceNow: number,
): number {
  // Sort by timestamp ascending
  const sorted = [...timeLogs]
    .filter(l => l.timestamp)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let waitingMs = 0;
  let openPauseAt: number | null = null;

  for (const log of sorted) {
    const ts = new Date(log.timestamp).getTime();

    if (log.action === 'pause' || log.action === 'hold') {
      // Start tracking a pause/hold period
      if (openPauseAt === null) {
        openPauseAt = ts;
      }
      // If already open (consecutive pauses), extend from the latest
    } else if (log.action === 'resume') {
      if (openPauseAt !== null) {
        waitingMs += ts - openPauseAt;
        openPauseAt = null;
      }
    }
  }

  // If currently paused (unclosed), add time from last pause to now
  if (openPauseAt !== null) {
    waitingMs += referenceNow - openPauseAt;
  }

  return waitingMs;
}

export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

/**
 * Calculates elapsed execution time from a start timestamp.
 * Updates every second when `isRunning` is true.
 *
 * @param startedAt  - ISO date string when work started (actualStart)
 * @param isRunning   - Whether the WO is currently in_progress (timer active)
 * @param timeLogs    - Optional time log entries for pause/resume tracking
 * @returns { elapsed, activeMs, waitingMs, calendarMs }
 */
export function useElapsedTime(
  startedAt: string | null | undefined,
  isRunning: boolean,
  timeLogs?: TimeLogEntry[] | null,
): ElapsedResult {
  const emptyResult: ElapsedResult = { elapsed: '00:00:00', activeMs: 0, waitingMs: 0, calendarMs: 0 };

  // Stable reference to time logs (avoid re-renders from shallow array changes)
  const stableLogs = useMemo(() => timeLogs ?? null, [timeLogs?.length]);

  // Compute waitingMs from logs (stable between ticks)
  const waitingMs = useMemo(() => {
    if (!stableLogs || !startedAt) return 0;
    const now = Date.now();
    return calculateWaitingMs(stableLogs, Date.now());
  }, [stableLogs, startedAt]);

  const [state, setState] = useState<ElapsedResult>(emptyResult);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const compute = useCallback(() => {
    if (!startedAt) return emptyResult;
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const calendarMs = Math.max(0, now - start);
    // Recalculate waiting for the current tick
    const currentWaitingMs = stableLogs ? calculateWaitingMs(stableLogs, now) : 0;
    const activeMs = Math.max(0, calendarMs - currentWaitingMs);
    return {
      elapsed: formatTime(activeMs),
      activeMs,
      waitingMs: currentWaitingMs,
      calendarMs,
    };
  }, [startedAt, stableLogs, emptyResult]);

  useEffect(() => {
    if (isRunning && startedAt) {
      setState(compute());
      intervalRef.current = setInterval(() => {
        setState(compute());
      }, 1000);
    } else if (startedAt) {
      // Frozen state: compute once based on last action
      // Find the last log entry timestamp to use as reference instead of now
      let referenceNow = Date.now();
      if (stableLogs && stableLogs.length > 0) {
        const lastTs = stableLogs.reduce((latest, log) => {
          const t = new Date(log.timestamp).getTime();
          return t > latest ? t : latest;
        }, 0);
        if (lastTs > 0) referenceNow = lastTs;
      }
      const start = new Date(startedAt).getTime();
      const calendarMs = Math.max(0, referenceNow - start);
      const currentWaitingMs = stableLogs ? calculateWaitingMs(stableLogs, referenceNow) : 0;
      const activeMs = Math.max(0, calendarMs - currentWaitingMs);
      setState({
        elapsed: formatTime(activeMs),
        activeMs,
        waitingMs: currentWaitingMs,
        calendarMs,
      });
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, startedAt, compute, stableLogs]);

  return state;
}

export default useElapsedTime;

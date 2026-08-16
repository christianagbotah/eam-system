// ============================================================================
// Elapsed Time Calculation — Pure function tests (Step 13c)
// ============================================================================
// Tests the extracted pure functions calculateWaitingMs() and formatTime()
// from useElapsedTime.ts. No React rendering required.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  calculateWaitingMs,
  formatTime,
  type TimeLogEntry,
} from '@/components/repairs/execution/hooks/useElapsedTime';

// ---- Helpers ----

const BASE = new Date('2025-01-15T10:00:00.000Z').getTime();

function log(action: string, offsetMs: number): TimeLogEntry {
  return {
    action,
    timestamp: new Date(BASE + offsetMs).toISOString(),
    startTime: null,
    endTime: null,
  };
}

// Pure computation matching useElapsedTime logic
function computeElapsed(
  startedAt: string | null | undefined,
  isRunning: boolean,
  timeLogs: TimeLogEntry[] | null | undefined,
  referenceNow: number,
): { elapsed: string; activeMs: number; waitingMs: number; calendarMs: number } {
  if (!startedAt) return { elapsed: '00:00:00', activeMs: 0, waitingMs: 0, calendarMs: 0 };

  const start = new Date(startedAt).getTime();
  let calendarMs: number;
  if (isRunning) {
    calendarMs = Math.max(0, referenceNow - start);
  } else {
    // Frozen: use last log entry timestamp as reference
    let ref = referenceNow;
    if (timeLogs && timeLogs.length > 0) {
      const lastTs = timeLogs.reduce((latest, l) => {
        const t = new Date(l.timestamp).getTime();
        return t > latest ? t : latest;
      }, 0);
      if (lastTs > 0) ref = lastTs;
    }
    calendarMs = Math.max(0, ref - start);
  }

  const currentWaitingMs = timeLogs ? calculateWaitingMs(timeLogs, isRunning ? referenceNow : calendarMs + start) : 0;
  const activeMs = Math.max(0, calendarMs - currentWaitingMs);
  return {
    elapsed: formatTime(activeMs),
    activeMs,
    waitingMs: currentWaitingMs,
    calendarMs,
  };
}

// ============================================================================

describe('formatTime', () => {
  // Test 6: Correctly formats HH:MM:SS
  it('should format 0 ms as 00:00:00', () => {
    expect(formatTime(0)).toBe('00:00:00');
  });

  it('should format seconds correctly', () => {
    expect(formatTime(5000)).toBe('00:00:05');
    expect(formatTime(59000)).toBe('00:00:59');
  });

  it('should format minutes correctly', () => {
    expect(formatTime(60_000)).toBe('00:01:00');
    expect(formatTime(300_000)).toBe('00:05:00');
    expect(formatTime(3599_000)).toBe('00:59:59');
  });

  it('should format hours correctly', () => {
    expect(formatTime(3_600_000)).toBe('01:00:00');
    expect(formatTime(3_615_000)).toBe('01:00:15');
    expect(formatTime(7_200_000)).toBe('02:00:00');
  });

  it('should pad all components to 2 digits', () => {
    expect(formatTime(3_601_000)).toBe('01:00:01');
    expect(formatTime(3_660_000)).toBe('01:01:00');
  });
});

describe('Timer elapsed computation', () => {
  const startISO = new Date(BASE).toISOString();

  // Test 1: No start time → returns 00:00:00
  it('should return 00:00:00 when no start time', () => {
    const result = computeElapsed(null, true, [], BASE + 3600_000);
    expect(result.elapsed).toBe('00:00:00');
    expect(result.activeMs).toBe(0);
    expect(result.calendarMs).toBe(0);
  });

  // Test 2: Running with no pauses → shows correct elapsed
  it('should show correct elapsed when running with no pauses', () => {
    const logs: TimeLogEntry[] = [log('start', 0)];
    const now = BASE + 3600_000; // 1 hour later
    const result = computeElapsed(startISO, true, logs, now);
    expect(result.activeMs).toBe(3600_000);
    expect(result.elapsed).toBe('01:00:00');
    expect(result.waitingMs).toBe(0);
  });

  // Test 3: Running with one pause-resume pair → subtracts pause duration
  it('should subtract pause duration with one pause-resume pair', () => {
    const logs: TimeLogEntry[] = [
      log('start', 0),
      log('pause', 600_000),    // pause at 10 min
      log('resume', 900_000),   // resume at 15 min → 5 min pause
    ];
    const now = BASE + 3600_000; // 1 hour calendar
    const result = computeElapsed(startISO, true, logs, now);
    // calendar = 60 min, waiting = 5 min, active = 55 min
    expect(result.activeMs).toBe(3300_000);
    expect(result.waitingMs).toBe(300_000);
    expect(result.elapsed).toBe('00:55:00');
  });

  // Test 4: Running with multiple pause-resume pairs → subtracts all pause durations
  it('should subtract all pause durations with multiple pause-resume pairs', () => {
    const logs: TimeLogEntry[] = [
      log('start', 0),
      log('pause', 600_000),    // 10 min: pause
      log('resume', 900_000),   // 15 min: resume → 5 min pause
      log('pause', 1800_000),   // 30 min: pause
      log('resume', 2700_000),  // 45 min: resume → 15 min pause
    ];
    const now = BASE + 3600_000; // 1 hour calendar
    const result = computeElapsed(startISO, true, logs, now);
    // waiting = 5 + 15 = 20 min, active = 40 min
    expect(result.activeMs).toBe(2400_000);
    expect(result.waitingMs).toBe(1200_000);
    expect(result.elapsed).toBe('00:40:00');
  });

  // Test 5: Not running → freezes at last computed value
  it('should freeze at last computed value when not running', () => {
    const logs: TimeLogEntry[] = [
      log('start', 0),
      log('pause', 600_000),    // paused at 10 min
      log('resume', 900_000),   // resumed at 15 min
      log('complete', 1800_000), // completed at 30 min
    ];
    const now = BASE + 7200_000; // 2 hours later (but not running, so frozen at complete)
    const result = computeElapsed(startISO, false, logs, now);
    // When not running, reference should be the last log entry timestamp (30 min)
    // calendar = 30 min, waiting = 5 min, active = 25 min
    expect(result.activeMs).toBe(1500_000);
    expect(result.elapsed).toBe('00:25:00');
  });

  // Test 6: Correctly formats HH:MM:SS (covered by formatTime tests above)
  it('should correctly format large elapsed times as HH:MM:SS', () => {
    const result = computeElapsed(startISO, true, [], BASE + 3661_000); // 1h 1m 1s
    expect(result.elapsed).toBe('01:01:01');
  });
});

describe('calculateWaitingMs', () => {
  // No logs → 0 waiting
  it('should return 0 when no time logs provided', () => {
    expect(calculateWaitingMs([], BASE + 60_000)).toBe(0);
  });

  // No pause entries → 0
  it('should return 0 when there are no pause entries', () => {
    const logs: TimeLogEntry[] = [
      log('start', 0),
      log('complete', 3600_000),
    ];
    expect(calculateWaitingMs(logs, BASE + 3600_000)).toBe(0);
  });

  // One pause-resume pair
  it('should subtract one pause-resume pair duration', () => {
    const logs: TimeLogEntry[] = [
      log('start', 0),
      log('pause', 600_000),
      log('resume', 900_000),
      log('complete', 3600_000),
    ];
    const now = BASE + 3600_000;
    expect(calculateWaitingMs(logs, now)).toBe(300_000); // 5 min
  });

  // Multiple pause-resume pairs
  it('should subtract multiple pause-resume pair durations', () => {
    const logs: TimeLogEntry[] = [
      log('start', 0),
      log('pause', 600_000),
      log('resume', 900_000),
      log('pause', 1800_000),
      log('resume', 2700_000),
      log('complete', 3600_000),
    ];
    const now = BASE + 3600_000;
    expect(calculateWaitingMs(logs, now)).toBe(1_200_000); // 20 min
  });

  // Unclosed pause uses referenceNow
  it('should include unclosed pause duration up to referenceNow', () => {
    const logs: TimeLogEntry[] = [
      log('start', 0),
      log('pause', 600_000),
    ];
    const frozenRef = BASE + 1200_000;
    expect(calculateWaitingMs(logs, frozenRef)).toBe(600_000); // 10 min
  });

  // Hold action treated same as pause
  it('should handle hold action the same as pause', () => {
    const logs: TimeLogEntry[] = [
      log('start', 0),
      log('hold', 600_000),
      log('resume', 900_000),
    ];
    const now = BASE + 3600_000;
    expect(calculateWaitingMs(logs, now)).toBe(300_000); // 5 min
  });

  // Non-chronological order
  it('should handle logs in non-chronological order', () => {
    const logs: TimeLogEntry[] = [
      log('resume', 900_000),
      log('start', 0),
      log('pause', 600_000),
    ];
    const now = BASE + 3600_000;
    expect(calculateWaitingMs(logs, now)).toBe(300_000); // 5 min after sort
  });

  // Non-pause/resume actions ignored
  it('should ignore non-pause/resume actions', () => {
    const logs: TimeLogEntry[] = [
      log('start', 0),
      log('comment', 300_000),
      log('complete', 3600_000),
    ];
    expect(calculateWaitingMs(logs, BASE + 3600_000)).toBe(0);
  });
});

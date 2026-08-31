import { db } from '@/lib/db';

export interface TimeLogNormalizationResult {
  normalizedCount: number;
  durationBackfilledCount: number;
  normalizedLogIds: string[];
}

/**
 * Normalize legacy/mixed WO time-log rows before authoritative cost calculation.
 *
 * Historical execution-service rows may contain only `timestamp`, while newer
 * timer/manual-entry flows populate `startTime`, `endTime`, and `duration`.
 * Authoritative costing must be able to handle both representations without
 * inventing elapsed time.
 *
 * Rules:
 * - `timestamp` is the canonical fallback for a missing `startTime`.
 * - A missing duration is derived ONLY for a closed start/resume session that
 *   has a real `endTime`.
 * - Active sessions (`endTime = null`) remain active and are not given a fake
 *   duration/end time; readiness checks must continue to block completion.
 * - Other actions (pause/complete/etc.) get startTime normalized only so legacy
 *   rows remain sortable, but they do not contribute synthetic labor hours.
 */
export async function normalizeWorkOrderTimeLogs(
  workOrderId: string,
): Promise<TimeLogNormalizationResult> {
  const logs = await db.workOrderTimeLog.findMany({
    where: { workOrderId },
    select: {
      id: true,
      action: true,
      timestamp: true,
      startTime: true,
      endTime: true,
      duration: true,
      breakMinutes: true,
    },
  });

  const updates: Array<ReturnType<typeof db.workOrderTimeLog.update>> = [];
  const normalizedLogIds: string[] = [];
  let durationBackfilledCount = 0;

  for (const log of logs) {
    const normalizedStart = log.startTime ?? log.timestamp;
    const data: { startTime?: Date; duration?: number } = {};

    if (!log.startTime) {
      data.startTime = normalizedStart;
    }

    const isExecutionSession = log.action === 'start' || log.action === 'resume';
    if (isExecutionSession && log.duration == null && log.endTime) {
      const elapsedHours =
        (log.endTime.getTime() - normalizedStart.getTime()) / (1000 * 60 * 60);
      const breakHours = (log.breakMinutes ?? 0) / 60;
      data.duration = Math.round(Math.max(0, elapsedHours - breakHours) * 100) / 100;
      durationBackfilledCount++;
    }

    if (Object.keys(data).length > 0) {
      normalizedLogIds.push(log.id);
      updates.push(
        db.workOrderTimeLog.update({
          where: { id: log.id },
          data,
        }),
      );
    }
  }

  if (updates.length > 0) {
    await db.$transaction(updates);
  }

  return {
    normalizedCount: normalizedLogIds.length,
    durationBackfilledCount,
    normalizedLogIds,
  };
}

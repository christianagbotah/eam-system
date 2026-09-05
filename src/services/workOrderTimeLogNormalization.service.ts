import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export interface TimeLogNormalizationResult {
  normalizedCount: number;
  durationBackfilledCount: number;
  normalizedLogIds: string[];
  laborHours: number;
}

type PlannedTimeLogUpdate = {
  id: string;
  data: {
    startTime?: Date;
    duration?: number;
  };
};

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
 * - `laborHours` is the sum of duration-bearing start/resume execution sessions,
 *   keeping labor effort distinct from total WO elapsed/calendar time.
 *
 * When a transaction client is supplied, reads and writes participate in the
 * caller's domain transaction; otherwise the helper creates its own transaction
 * for the update batch to preserve its existing standalone behavior.
 */
export async function normalizeWorkOrderTimeLogs(
  workOrderId: string,
  tx?: Prisma.TransactionClient,
): Promise<TimeLogNormalizationResult> {
  const client = tx ?? db;
  const logs = await client.workOrderTimeLog.findMany({
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

  const plannedUpdates: PlannedTimeLogUpdate[] = [];
  let durationBackfilledCount = 0;
  let laborHours = 0;

  for (const log of logs) {
    const normalizedStart = log.startTime ?? log.timestamp;
    const data: PlannedTimeLogUpdate['data'] = {};

    if (!log.startTime) {
      data.startTime = normalizedStart;
    }

    const isExecutionSession = log.action === 'start' || log.action === 'resume';
    let effectiveDuration = log.duration;

    if (isExecutionSession && effectiveDuration == null && log.endTime) {
      const elapsedHours =
        (log.endTime.getTime() - normalizedStart.getTime()) / (1000 * 60 * 60);
      const breakHours = (log.breakMinutes ?? 0) / 60;
      effectiveDuration = Math.round(Math.max(0, elapsedHours - breakHours) * 100) / 100;
      data.duration = effectiveDuration;
      durationBackfilledCount++;
    }

    if (isExecutionSession && effectiveDuration != null && effectiveDuration > 0) {
      laborHours += effectiveDuration;
    }

    if (Object.keys(data).length > 0) {
      plannedUpdates.push({ id: log.id, data });
    }
  }

  if (plannedUpdates.length > 0) {
    const applyUpdates = async (writeClient: Prisma.TransactionClient) => {
      for (const update of plannedUpdates) {
        await writeClient.workOrderTimeLog.update({
          where: { id: update.id },
          data: update.data,
        });
      }
    };

    if (tx) {
      await applyUpdates(tx);
    } else {
      await db.$transaction(applyUpdates);
    }
  }

  return {
    normalizedCount: plannedUpdates.length,
    durationBackfilledCount,
    normalizedLogIds: plannedUpdates.map((update) => update.id),
    laborHours: Math.round(laborHours * 100) / 100,
  };
}

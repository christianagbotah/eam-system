import type { Prisma } from '@prisma/client';

export interface ClosedWorkSessionsResult {
  closedTimerIds: string[];
  closedHours: number;
  actualHours: number;
}

/**
 * Close a technician's genuinely active execution sessions on one WO.
 *
 * The original action (`start` or `resume`) is deliberately preserved because
 * authoritative labor costing classifies execution effort by that action. A
 * pause/hold/handover is an event that ends the session; it must not rewrite the
 * session into a non-labor action.
 */
export async function closeActiveWorkSessions(
  tx: Prisma.TransactionClient,
  workOrderId: string,
  userId: string,
  endedAt: Date,
  reason: string,
): Promise<ClosedWorkSessionsResult> {
  const activeLogs = await tx.workOrderTimeLog.findMany({
    where: {
      workOrderId,
      userId,
      action: { in: ['start', 'resume'] },
      endTime: null,
    },
    orderBy: { timestamp: 'asc' },
  });

  let closedHours = 0;
  for (const log of activeLogs) {
    const startedAt = log.startTime ?? log.timestamp;
    const elapsedHours = Math.max(
      0,
      (endedAt.getTime() - startedAt.getTime()) / 3_600_000 - ((log.breakMinutes ?? 0) / 60),
    );
    const duration = Math.round(elapsedHours * 100) / 100;
    closedHours += duration;

    await tx.workOrderTimeLog.update({
      where: { id: log.id },
      data: {
        startTime: startedAt,
        endTime: endedAt,
        duration,
        pauseReason: reason,
        notes: log.notes ? `${log.notes} | ${reason}` : reason,
      },
    });
  }

  const laborLogs = await tx.workOrderTimeLog.findMany({
    where: {
      workOrderId,
      action: { in: ['start', 'resume'] },
      duration: { not: null },
    },
    select: { duration: true },
  });
  const actualHours = Math.round(
    laborLogs.reduce((sum, log) => sum + (log.duration ?? 0), 0) * 100,
  ) / 100;

  if (activeLogs.length > 0) {
    await tx.workOrder.update({
      where: { id: workOrderId },
      data: { actualHours },
    });
  }

  return {
    closedTimerIds: activeLogs.map((log) => log.id),
    closedHours: Math.round(closedHours * 100) / 100,
    actualHours,
  };
}

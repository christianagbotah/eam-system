import { db } from '@/lib/db';

interface ReliabilityEvent {
  workOrderId: string;
  assetId?: string;
  componentId?: string;
  failureMode?: string;
  failureCause?: string;
  correctiveAction?: string;
  downtimeMinutes?: number;
  repairCost?: number;
  isRepeatFailure?: boolean;
  performedById: string;
}

/**
 * Emit a reliability event when a WO is closed.
 * Updates FailureRecord (when componentId is available) and reliability metrics.
 * Designed to be called fire-and-forget after planner closeout.
 */
export async function emitReliabilityEvent(event: ReliabilityEvent): Promise<void> {
  try {
    // 1. Update or create FailureRecord if failure data AND componentId are available
    //    (FailureRecord.componentId is required in the schema)
    if ((event.failureMode || event.failureCause) && event.componentId) {
      await db.failureRecord.upsert({
        where: { id: `${event.workOrderId}-reliability` },
        update: {
          resolvedAt: new Date(),
          repairCost: event.repairCost || 0,
          downtimeMinutes: event.downtimeMinutes || 0,
          rootCause: event.failureCause || undefined,
          correctiveAction: event.correctiveAction || undefined,
          reportedById: event.performedById,
        },
        create: {
          id: `${event.workOrderId}-reliability`,
          workOrderId: event.workOrderId,
          assetId: event.assetId || null,
          componentId: event.componentId,
          failureMode: event.failureMode || 'unknown',
          failureCause: event.failureCause || null,
          correctiveAction: event.correctiveAction || null,
          resolvedAt: new Date(),
          repairCost: event.repairCost || 0,
          downtimeMinutes: event.downtimeMinutes || 0,
          reportedById: event.performedById,
        },
      }).catch(() => {
        console.warn(`[reliability] Failed to upsert FailureRecord for WO ${event.workOrderId}`);
      });
    } else if (event.failureMode || event.failureCause) {
      // Failure data available but no componentId — log a warning instead of failing
      console.warn(`[reliability] Skipping FailureRecord creation for WO ${event.workOrderId}: componentId is required but not provided`);
    }

    console.log(`[reliability] Event emitted for WO ${event.workOrderId}`);
  } catch (err) {
    console.error(`[reliability] Failed to emit event for WO ${event.workOrderId}:`, err);
  }
}

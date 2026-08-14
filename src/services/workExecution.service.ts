/**
 * Work Execution Domain Service — Canonical WO lifecycle orchestration
 *
 * Phase 2C stub — will be fleshed out in subsequent phases.
 * All WO status transitions during execution must go through this service.
 */

import { db } from '@/lib/db';
import { executeTransition } from '@/lib/state-machine';
import type { Prisma } from '@prisma/client';

// TODO (P2K): When a WO is in `pending_handover` status and transitioning back to `in_progress`,
// validate that a ShiftHandover record exists for this WO with status='confirmed'.
// If no confirmed handover exists, block the transition and return an error explaining
// that a confirmed shift handover is required before resuming work.

export interface SessionContext {
  userId: string;
  fullName?: string;
  roles: string[];
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

export type TransitionResult = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  notifications?: Array<{ userId: string; type: string; title: string; message: string; entityType?: string; entityId?: string; actionUrl?: string }>;
};

/**
 * Start work on a WO. Only assigned technician or team leader.
 */
export async function startWork(
  workOrderId: string,
  session: SessionContext,
  options?: { reason?: string; tx?: Prisma.TransactionClient },
): Promise<TransitionResult> {
  // TODO: P2C — validate team membership, check readiness, validate eligibility
  const result = await executeTransition('work_order', workOrderId, 'in_progress', session, {
    reason: options?.reason,
    extraData: { actualStart: new Date() },
    tx: options?.tx,
  });
  return result;
}

/**
 * Submit WO for completion. Team leader only for multi-tech WOs.
 */
export async function submitCompletion(
  workOrderId: string,
  session: SessionContext,
  completionData: Record<string, unknown>,
  options?: { tx?: Prisma.TransactionClient },
): Promise<TransitionResult> {
  // TODO: P2L — validate readiness, authority, calculate authoritative totals
  const result = await executeTransition('work_order', workOrderId, 'completed', session, {
    extraData: { ...completionData, actualEnd: new Date() },
    tx: options?.tx,
  });
  return result;
}

/**
 * Supervisor verification. Transition: completed → verified.
 */
export async function supervisorVerify(
  workOrderId: string,
  session: SessionContext,
  reviewData: { notes?: string; checklistPassed?: boolean },
  options?: { tx?: Prisma.TransactionClient },
): Promise<TransitionResult> {
  // TODO: P2N — validate supervisor role, check completion report
  const result = await executeTransition('work_order', workOrderId, 'verified', session, {
    extraData: reviewData,
    tx: options?.tx,
  });
  return result;
}

/**
 * Request rework. Transition: completed|verified → in_progress (requires reason).
 */
export async function requestRework(
  workOrderId: string,
  session: SessionContext,
  reworkData: { reason: string; category?: string },
  options?: { tx?: Prisma.TransactionClient },
): Promise<TransitionResult> {
  // TODO: P2N — increment rework counter, notify team
  const result = await executeTransition('work_order', workOrderId, 'in_progress', session, {
    reason: reworkData.reason,
    extraData: { reworkReason: reworkData.reason, reworkCategory: reworkData.category },
    tx: options?.tx,
  });
  return result;
}

/**
 * Planner closeout. Transition: verified → closed.
 */
export async function plannerClose(
  workOrderId: string,
  session: SessionContext,
  closeoutData: Record<string, unknown>,
  options?: { tx?: Prisma.TransactionClient },
): Promise<TransitionResult> {
  // TODO: P2O — validate readiness, KPI snapshot, reliability event
  const result = await executeTransition('work_order', workOrderId, 'closed', session, {
    extraData: closeoutData,
    tx: options?.tx,
  });
  return result;
}

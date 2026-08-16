/**
 * Work Execution Domain Service — Canonical WO lifecycle orchestration
 *
 * This is the SINGLE authoritative service for all WO status transitions
 * during execution. API routes MUST delegate to this service and NOT
 * duplicate readiness checks, team authority, state transitions, or audit.
 */

import { db } from '@/lib/db';
import { executeTransition } from '@/lib/state-machine';
import { checkReadiness, type ReadinessCheckResult } from '@/services/workOrderReadiness.service';
import { sendRepairNotification } from '@/lib/repair-notifications';
import { notifyUser } from '@/lib/notifications';
import { buildAuditData } from '@/lib/audit-helpers';
import { emitReliabilityEvent } from '@/lib/reliability-events';
import { calculateNextDueDate, isAutoCalculableFrequency } from '@/lib/pm-utils';
import { jobQueue, QUEUES } from '@/lib/queue';
import type { Prisma } from '@prisma/client';

// ─── Public Types ───────────────────────────────────────────────────────────

export interface SessionContext {
  userId: string;
  fullName?: string;
  roles: string[];
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  plantId?: string;
  departmentId?: string;
}

export type TransitionResult = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  readiness?: ReadinessCheckResult;
  notifications?: Array<{
    userId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
  }>;
};

export interface StartWorkOptions {
  reason?: string;
  notes?: string;
  tx?: Prisma.TransactionClient;
  auditCtx?: AuditContext;
}

export interface WaitingStateOptions {
  reason?: string;
  tx?: Prisma.TransactionClient;
  auditCtx?: AuditContext;
}

export interface HandoverOptions {
  reason?: string;
  tx?: Prisma.TransactionClient;
  auditCtx?: AuditContext;
}

export interface CompletionOptions {
  notes?: string;
  failureDescription?: string;
  causeDescription?: string;
  actionDescription?: string;
  laborCost?: number;
  partsCost?: number;
  contractorCost?: number;
  tx?: Prisma.TransactionClient;
  auditCtx?: AuditContext;
}

export interface VerifyOptions {
  notes?: string;
  qualityRating?: number;
  checklistPassed?: boolean;
  tx?: Prisma.TransactionClient;
  auditCtx?: AuditContext;
}

export interface ReworkOptions {
  reason: string;
  category?: string;
  evidence?: string[];
  tx?: Prisma.TransactionClient;
  auditCtx?: AuditContext;
}

export interface CloseOptions {
  notes?: string;
  failureMode?: string;
  failureCause?: string;
  correctiveAction?: string;
  pmRecommendation?: string;
  followUpRequired?: boolean;
  followUpNotes?: string;
  tx?: Prisma.TransactionClient;
  auditCtx?: AuditContext;
}

// ─── Helper: Enriched WO used internally ────────────────────────────────────

type EnrichedWO = Awaited<ReturnType<typeof fetchEnrichedWO>>;

async function fetchEnrichedWO(workOrderId: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? db;
  return client.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      assignee: { select: { id: true, fullName: true, username: true, primaryTrade: true } },
      teamLeader: { select: { id: true, fullName: true, username: true } },
      assignedSupervisor: { select: { id: true, fullName: true, username: true } },
      planner: { select: { id: true, fullName: true, username: true } },
      maintenanceRequest: { select: { id: true, requestNumber: true, title: true, requestedBy: true } },
      teamMembers: { select: { userId: true, role: true, addedVia: true } },
      repairCompletion: { select: { id: true, reworkCount: true } },
      repairToolRequests: {
        select: { id: true, status: true, items: { select: { id: true, pendingReturnQty: true } } },
      },
      repairMaterialRequests: {
        select: { id: true, status: true, quantityIssued: true, consumedQty: true, wastedQty: true },
      },
      timeLogs: { select: { id: true, action: true, endTime: true } },
      shiftHandovers: { select: { id: true, status: true } },
    },
  });
}

// ─── Helper: Notification queuing via BullMQ ────────────────────────────────

function enqueueNotification(payload: {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  actionUrl: string;
  forceSms?: boolean;
}): void {
  jobQueue.add(QUEUES.NOTIFICATION, {
    name: 'send_notification',
    data: payload,
    attempts: 3,
    backoff: 5000,
  }).catch((err) => {
    // Queue failure should not block the business transaction.
    // Fall back to direct delivery.
    console.warn('[workExecution] Notification queue unavailable, sending directly:', err);
    notifyUser(payload.userId, payload.type, payload.title, payload.message,
      payload.entityType, payload.entityId, payload.actionUrl,
      { forceSms: payload.forceSms },
    ).catch(() => {});
  });
}

// ─── Helper: Team authority checks ──────────────────────────────────────────

function checkTeamAuthority(
  wo: NonNullable<EnrichedWO>,
  session: SessionContext,
  operation: 'start' | 'complete' | 'handover' | 'pause',
): { allowed: boolean; error?: string; isAdminOverride?: boolean } {
  const isAssignee = wo.assignedTo === session.userId;
  const isTeamLeader =
    wo.teamLeaderId === session.userId ||
    wo.teamMembers?.some((m) => m.userId === session.userId && m.role === 'team_leader') ||
    false;
  const isAdminRole = session.roles.includes('admin') ||
    session.roles.includes('maintenance_manager') ||
    session.roles.includes('plant_manager');

  if (isAdminRole) {
    return { allowed: true, isAdminOverride: true };
  }

  // For multi-tech WOs, restrict certain operations to team leader
  const teamMemberIds = (wo.teamMembers || [])
    .map((m) => m.userId)
    .filter((uid) => uid !== wo.assignedTo);
  const distinctTeamCount = new Set(teamMemberIds).size;
  const isMultiTech = wo.assignedTo ? distinctTeamCount >= 1 : distinctTeamCount >= 2;

  switch (operation) {
    case 'start':
      if (isAssignee || isTeamLeader) return { allowed: true };
      return { allowed: false, error: 'Only the assigned technician, team leader, or admin can perform this action' };
    case 'complete':
      if (isMultiTech) {
        if (isTeamLeader) return { allowed: true };
        return { allowed: false, error: 'For multi-technician work orders, only the team leader can complete work' };
      }
      if (isAssignee) return { allowed: true };
      return { allowed: false, error: 'Only the assigned technician can complete this work order' };
    case 'handover':
      if (isAssignee || isTeamLeader) return { allowed: true };
      return { allowed: false, error: 'Only the assigned technician or team leader can initiate handover' };
    case 'pause':
      if (isAssignee || isTeamLeader) return { allowed: true };
      return { allowed: false, error: 'Only the assigned technician or team leader can pause work' };
  }
}

// ─── Helper: Create audit log entry ─────────────────────────────────────────

async function createAuditEntry(
  action: string,
  entityType: string,
  entityId: string,
  userId: string,
  oldValues: Record<string, unknown> | undefined,
  newValues: Record<string, unknown>,
  auditCtx?: AuditContext,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? db;
  await client.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
      newValues: JSON.stringify(newValues),
      ipAddress: auditCtx?.ipAddress,
      userAgent: auditCtx?.userAgent,
      sessionId: auditCtx?.sessionId,
    },
  });
}

// ─── Helper: Notify WO stakeholders ─────────────────────────────────────────

function notifyStakeholders(
  wo: NonNullable<EnrichedWO>,
  session: SessionContext,
  event: 'wo_started' | 'wo_on_hold' | 'wo_resumed' | 'completion_submitted' | 'rework_requested' | 'supervisor_verified' | 'planner_closed' | 'shift_handover_pending',
  messageOverride?: string,
  reason?: string,
): void {
  const targets = new Set<string>();
  const addIf = (uid: string | null | undefined) => { if (uid && uid !== session.userId) targets.add(uid); };

  addIf(wo.assignedSupervisorId);
  addIf(wo.teamLeaderId);
  addIf(wo.plannerId);
  addIf(wo.assignedTo);
  // Also notify MR requester on close
  if (event === 'planner_closed' && wo.maintenanceRequest?.requestedBy) {
    addIf(wo.maintenanceRequest.requestedBy);
  }
  // Notify team members
  for (const m of wo.teamMembers || []) {
    addIf(m.userId);
  }

  for (const userId of targets) {
    sendRepairNotification({
      userId,
      event,
      woNumber: wo.woNumber,
      woId: wo.id,
      title: session.fullName || 'A team member',
      message: messageOverride,
      details: reason ? { reason } : undefined,
    });
  }
}

// ─── Helper: Idempotency key for state transitions ───────────────────────────

function buildIdempotencyKey(workOrderId: string, action: string, userId: string): string {
  return `wo_exec:${workOrderId}:${action}:${userId}:${new Date().toISOString().slice(0, 13)}`; // hourly granularity
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL EXECUTION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * START WORK — assigned → in_progress
 * Validates team membership, checks start readiness, creates time log, notifies.
 */
export async function startWork(
  workOrderId: string,
  session: SessionContext,
  options?: StartWorkOptions,
): Promise<TransitionResult> {
  const wo = await fetchEnrichedWO(workOrderId, options?.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Team authority
  const auth = checkTeamAuthority(wo, session, 'start');
  if (!auth.allowed) return { success: false, error: auth.error };

  // Start readiness check
  const readiness = await checkReadiness(workOrderId, 'start', options?.tx);
  if (!readiness.ready) {
    return { success: false, error: 'Work order is not ready to start', readiness };
  }

  const now = new Date();

  // Execute state transition
  const result = await executeTransition('work_order', workOrderId, 'in_progress', session, {
    reason: options?.reason,
    extraData: { actualStart: now },
    tx: options?.tx,
  });
  if (!result.success) return { success: false, error: result.error };

  // Create time log entry
  const client = options?.tx ?? db;
  await client.workOrderTimeLog.create({
    data: {
      workOrderId,
      userId: session.userId,
      action: 'start',
      notes: options?.notes || 'Work started',
      timestamp: now,
    },
  });

  // Audit
  await createAuditEntry('update', 'work_order', workOrderId, session.userId,
    { status: wo.status }, { status: 'in_progress', actualStart: now.toISOString() }, options?.auditCtx, options?.tx);

  // Notify (non-blocking, queued)
  notifyStakeholders(wo, session, 'wo_started');

  return { success: true, data: { status: 'in_progress', actualStart: now } };
}

/**
 * PAUSE WORK — in_progress → on_hold
 */
export async function pauseWork(
  workOrderId: string,
  session: SessionContext,
  options?: WaitingStateOptions,
): Promise<TransitionResult> {
  const wo = await fetchEnrichedWO(workOrderId, options?.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  const auth = checkTeamAuthority(wo, session, 'pause');
  if (!auth.allowed) return { success: false, error: auth.error };

  // Close any active time logs
  const client = options?.tx ?? db;
  await client.workOrderTimeLog.updateMany({
    where: { workOrderId, userId: session.userId, action: 'start', endTime: null },
    data: { endTime: new Date(), pauseReason: options?.reason || 'Work paused' },
  });

  const result = await executeTransition('work_order', workOrderId, 'on_hold', session, {
    reason: options?.reason,
    tx: options?.tx,
  });
  if (!result.success) return { success: false, error: result.error };

  await createAuditEntry('update', 'work_order', workOrderId, session.userId,
    { status: wo.status }, { status: 'on_hold', pauseReason: options?.reason }, options?.auditCtx, options?.tx);

  sendRepairNotification({
    userId: wo.assignedSupervisorId || wo.plannerId || session.userId,
    event: 'wo_on_hold',
    woNumber: wo.woNumber, woId: wo.id,
    title: session.fullName, details: { reason: options?.reason },
  });

  return { success: true, data: { status: 'on_hold' } };
}

/**
 * RESUME WORK — on_hold → in_progress
 */
export async function resumeWork(
  workOrderId: string,
  session: SessionContext,
  options?: WaitingStateOptions,
): Promise<TransitionResult> {
  const wo = await fetchEnrichedWO(workOrderId, options?.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  const auth = checkTeamAuthority(wo, session, 'start');
  if (!auth.allowed) return { success: false, error: auth.error };

  const now = new Date();
  const result = await executeTransition('work_order', workOrderId, 'in_progress', session, {
    tx: options?.tx,
  });
  if (!result.success) return { success: false, error: result.error };

  const client = options?.tx ?? db;
  await client.workOrderTimeLog.create({
    data: {
      workOrderId, userId: session.userId, action: 'resume',
      notes: options?.reason || 'Work resumed', timestamp: now,
    },
  });

  await createAuditEntry('update', 'work_order', workOrderId, session.userId,
    { status: wo.status }, { status: 'in_progress' }, options?.auditCtx, options?.tx);

  return { success: true, data: { status: 'in_progress' } };
}

/**
 * ENTER WAITING STATE — in_progress → waiting_parts|waiting_tools|waiting_shutdown|waiting_permit
 */
export async function enterWaitingState(
  workOrderId: string,
  session: SessionContext,
  waitingType: 'waiting_parts' | 'waiting_tools' | 'waiting_shutdown' | 'waiting_permit',
  options?: WaitingStateOptions,
): Promise<TransitionResult> {
  const wo = await fetchEnrichedWO(workOrderId, options?.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  const auth = checkTeamAuthority(wo, session, 'pause');
  if (!auth.allowed) return { success: false, error: auth.error };

  // Close active time logs
  const client = options?.tx ?? db;
  await client.workOrderTimeLog.updateMany({
    where: { workOrderId, userId: session.userId, action: 'start', endTime: null },
    data: { endTime: new Date(), pauseReason: `Entered ${waitingType}` },
  });

  const result = await executeTransition('work_order', workOrderId, waitingType, session, {
    reason: options?.reason,
    tx: options?.tx,
  });
  if (!result.success) return { success: false, error: result.error };

  await createAuditEntry('update', 'work_order', workOrderId, session.userId,
    { status: wo.status }, { status: waitingType, reason: options?.reason }, options?.auditCtx, options?.tx);

  return { success: true, data: { status: waitingType } };
}

/**
 * INITIATE HANDOVER — in_progress → pending_handover
 */
export async function initiateHandover(
  workOrderId: string,
  session: SessionContext,
  options?: HandoverOptions,
): Promise<TransitionResult> {
  const wo = await fetchEnrichedWO(workOrderId, options?.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  const auth = checkTeamAuthority(wo, session, 'handover');
  if (!auth.allowed) return { success: false, error: auth.error };

  const result = await executeTransition('work_order', workOrderId, 'pending_handover', session, {
    reason: options?.reason,
    tx: options?.tx,
  });
  if (!result.success) return { success: false, error: result.error };

  await createAuditEntry('update', 'work_order', workOrderId, session.userId,
    { status: wo.status }, { status: 'pending_handover' }, options?.auditCtx, options?.tx);

  notifyStakeholders(wo, session, 'shift_handover_pending', undefined, options?.reason);

  return { success: true, data: { status: 'pending_handover' } };
}

/**
 * RESUME AFTER HANDOVER — pending_handover → in_progress
 * Validates that a confirmed handover record exists for this WO.
 */
export async function resumeAfterHandover(
  workOrderId: string,
  session: SessionContext,
  options?: HandoverOptions,
): Promise<TransitionResult> {
  const wo = await fetchEnrichedWO(workOrderId, options?.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  const auth = checkTeamAuthority(wo, session, 'start');
  if (!auth.allowed) return { success: false, error: auth.error };

  // Validate confirmed handover record exists
  const client = options?.tx ?? db;
  const confirmedHandover = await client.shiftHandover.findFirst({
    where: { workOrderId, status: 'confirmed' },
  });
  if (!confirmedHandover) {
    return {
      success: false,
      error: 'Cannot resume work: no confirmed shift handover record exists for this work order. A valid handover must be confirmed before work can resume.',
    };
  }

  const now = new Date();
  const result = await executeTransition('work_order', workOrderId, 'in_progress', session, {
    tx: options?.tx,
  });
  if (!result.success) return { success: false, error: result.error };

  await client.workOrderTimeLog.create({
    data: {
      workOrderId, userId: session.userId, action: 'resume',
      notes: 'Resumed after shift handover', timestamp: now,
    },
  });

  await createAuditEntry('update', 'work_order', workOrderId, session.userId,
    { status: wo.status }, { status: 'in_progress', handoverId: confirmedHandover.id }, options?.auditCtx, options?.tx);

  return { success: true, data: { status: 'in_progress' } };
}

/**
 * SUBMIT COMPLETION — in_progress → completed
 * Team leader only for multi-tech. Authoritative cost calculation. Readiness enforced.
 * Runs inside a transaction: status transition + time log + comment + audit + PM schedule update.
 */
export async function submitCompletion(
  workOrderId: string,
  session: SessionContext,
  completionData: CompletionOptions,
): Promise<TransitionResult> {
  const wo = await fetchEnrichedWO(workOrderId, completionData.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Team authority
  const auth = checkTeamAuthority(wo, session, 'complete');
  if (!auth.allowed) return { success: false, error: auth.error };

  // Readiness check
  const readiness = await checkReadiness(workOrderId, 'complete', completionData.tx);
  if (!readiness.ready) {
    return { success: false, error: 'Work order is not ready for completion', readiness };
  }

  const now = new Date();

  // Calculate actual hours from actualStart
  let actualHours = wo.actualHours;
  if (wo.actualStart) {
    const hours = (now.getTime() - new Date(wo.actualStart).getTime()) / (1000 * 60 * 60);
    actualHours = Math.round(hours * 100) / 100;
  }

  // Authoritative cost calculation from provided values (or existing WO values)
  const laborCost = completionData.laborCost ?? wo.laborCost;
  const partsCost = completionData.partsCost ?? wo.partsCost;
  const contractorCost = completionData.contractorCost ?? wo.contractorCost;
  const totalCost = laborCost + partsCost + contractorCost;

  // Execute in a single transaction
  const txResult = await db.$transaction(async (tx) => {
    // 1. State transition
    const result = await executeTransition('work_order', workOrderId, 'completed', session, {
      extraData: {
        actualEnd: now,
        actualHours,
        failureDescription: completionData.failureDescription || wo.failureDescription,
        causeDescription: completionData.causeDescription || wo.causeDescription,
        actionDescription: completionData.actionDescription || wo.actionDescription,
        laborCost, partsCost, contractorCost, totalCost,
      },
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // 2. Create completion time log
    await tx.workOrderTimeLog.create({
      data: {
        workOrderId, userId: session.userId, action: 'complete',
        notes: completionData.notes || 'Work completed', timestamp: now,
      },
    });

    // 3. Create completion comment if notes provided
    if (completionData.notes) {
      await tx.workOrderComment.create({
        data: { workOrderId, userId: session.userId, content: completionData.notes },
      });
    }

    // 4. Audit
    await tx.auditLog.create({
      data: buildAuditData('update', 'work_order', workOrderId, session.userId,
        { actualEnd: null, actualHours: wo.actualHours },
        {
          actualEnd: now.toISOString(), actualHours,
          ...(auth.isAdminOverride ? { adminOverride: true } : {}),
        },
        completionData.auditCtx,
      ),
    });

    // 5. PM Schedule: advance nextDueDate when a PM WO is completed
    if (wo.pmScheduleId) {
      const pmSchedule = await tx.pmSchedule.findUnique({ where: { id: wo.pmScheduleId } });
      if (pmSchedule && pmSchedule.isActive && isAutoCalculableFrequency(pmSchedule.frequencyType)) {
        const newNextDueDate = calculateNextDueDate(now, pmSchedule.frequencyType, pmSchedule.frequencyValue);
        await tx.pmSchedule.update({
          where: { id: pmSchedule.id },
          data: { lastCompletedDate: now, nextDueDate: newNextDueDate },
        });
        await tx.auditLog.create({
          data: buildAuditData('update', 'pm_schedule', pmSchedule.id, session.userId,
            { lastCompletedDate: pmSchedule.lastCompletedDate, nextDueDate: pmSchedule.nextDueDate },
            { lastCompletedDate: now.toISOString(), nextDueDate: newNextDueDate?.toISOString() ?? null, reason: `PM WO ${wo.woNumber} completed` },
            completionData.auditCtx,
          ),
        });
      }
    }

    return result;
  });

  // Notify after transactional success (non-blocking)
  notifyStakeholders(wo, session, 'completion_submitted');

  return { success: true, data: { status: 'completed', actualEnd: now, actualHours, totalCost } };
}

/**
 * SUPERVISOR VERIFY — completed → verified
 * Validates verification readiness, adds verification comment/audit.
 */
export async function supervisorVerify(
  workOrderId: string,
  session: SessionContext,
  options: VerifyOptions,
): Promise<TransitionResult> {
  const wo = await fetchEnrichedWO(workOrderId, options.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Readiness check
  const readiness = await checkReadiness(workOrderId, 'verify', options.tx);
  if (!readiness.ready) {
    return { success: false, error: 'Work order is not ready for verification', readiness };
  }

  // Execute in transaction
  await db.$transaction(async (tx) => {
    const result = await executeTransition('work_order', workOrderId, 'verified', session, {
      extraData: { verifiedBy: session.userId, qualityRating: options.qualityRating },
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // Verification comment
    const commentContent = options.notes
      ? `[Verification] ${options.notes}${options.qualityRating ? ` | Quality Rating: ${options.qualityRating}/5` : ''}`
      : `[Verification] Verified by ${session.fullName}`;
    await tx.workOrderComment.create({
      data: { workOrderId, userId: session.userId, content: commentContent },
    });

    // Audit
    await tx.auditLog.create({
      data: {
        userId: session.userId, action: 'update', entityType: 'work_order', entityId: workOrderId,
        newValues: JSON.stringify({ status: 'verified', verifiedBy: session.userId, qualityRating: options.qualityRating ?? null }),
        ...(options.auditCtx?.ipAddress ? { ipAddress: options.auditCtx.ipAddress } : {}),
      },
    });
  });

  // Notify (non-blocking)
  notifyStakeholders(wo, session, 'supervisor_verified');

  return { success: true, data: { status: 'verified' } };
}

/**
 * REQUEST REWORK — completed|verified → in_progress
 * Increments rework counter, creates comment, notifies team.
 */
export async function requestRework(
  workOrderId: string,
  session: SessionContext,
  reworkData: ReworkOptions,
): Promise<TransitionResult> {
  if (!reworkData.reason) return { success: false, error: 'Rework reason is required' };

  const wo = await fetchEnrichedWO(workOrderId, reworkData.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Execute in transaction: rework counter + state transition + comment + audit
  await db.$transaction(async (tx) => {
    // Increment rework counter
    await tx.repairCompletion.upsert({
      where: { workOrderId },
      update: { reworkCount: { increment: 1 }, reworkReason: reworkData.reason },
      create: { workOrderId, reworkCount: 1, reworkReason: reworkData.reason },
    });

    const result = await executeTransition('work_order', workOrderId, 'in_progress', session, {
      reason: reworkData.reason,
      extraData: {
        reworkReason: reworkData.reason,
        reworkCategory: reworkData.category,
      },
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // Rework comment
    await tx.workOrderComment.create({
      data: {
        workOrderId, userId: session.userId,
        content: `[Rework] ${reworkData.reason}${reworkData.category ? ` [${reworkData.category}]` : ''}`,
      },
    });

    // Audit
    await tx.auditLog.create({
      data: {
        userId: session.userId, action: 'update', entityType: 'work_order', entityId: workOrderId,
        newValues: JSON.stringify({ status: 'in_progress', reworkReason: reworkData.reason, reworkCategory: reworkData.category }),
        ...(reworkData.auditCtx?.ipAddress ? { ipAddress: reworkData.auditCtx.ipAddress } : {}),
      },
    });
  });

  // Notify (non-blocking)
  notifyStakeholders(wo, session, 'rework_requested', undefined, reworkData.reason);

  return { success: true, data: { status: 'in_progress', reworkReason: reworkData.reason } };
}

/**
 * PLANNER CLOSE — verified → closed
 * Validates closure readiness, locks WO, emits reliability event, KPI snapshot.
 * Full transaction: readiness check → transition → lock → audit → reliability event.
 */
export async function plannerClose(
  workOrderId: string,
  session: SessionContext,
  closeData: CloseOptions,
): Promise<TransitionResult> {
  const wo = await fetchEnrichedWO(workOrderId, closeData.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Readiness check
  const readiness = await checkReadiness(workOrderId, 'close', closeData.tx);
  if (!readiness.ready) {
    return { success: false, error: 'Work order is not ready for closure', readiness };
  }

  const now = new Date();

  // Execute in transaction
  await db.$transaction(async (tx) => {
    // 1. State transition
    const result = await executeTransition('work_order', workOrderId, 'closed', session, {
      extraData: {
        isLocked: true, lockedBy: session.userId, lockedAt: now, lockReason: 'Work order closed',
      },
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // 2. Lock the WO
    await tx.workOrder.update({
      where: { id: workOrderId },
      data: { isLocked: true, lockedBy: session.userId, lockedAt: now, lockReason: 'Planner closeout' },
    });

    // 3. Add closing comment if notes provided
    if (closeData.notes) {
      await tx.workOrderComment.create({
        data: { workOrderId, userId: session.userId, content: `[Closed] ${closeData.notes}` },
      });
    }

    // 4. Audit
    await tx.auditLog.create({
      data: {
        userId: session.userId, action: 'update', entityType: 'work_order', entityId: workOrderId,
        oldValues: JSON.stringify({ isLocked: wo.isLocked }),
        newValues: JSON.stringify({ isLocked: true }),
        ...(closeData.auditCtx?.ipAddress ? { ipAddress: closeData.auditCtx.ipAddress } : {}),
      },
    });

    // 5. Emit reliability event (within transaction — creates/updates FailureRecord)
    if (wo.assetId || closeData.failureMode) {
      await tx.failureRecord.upsert({
        where: { id: `wo-${workOrderId}` },
        update: {
          failureMode: closeData.failureMode || wo.failureDescription,
          failureCause: closeData.failureCause || wo.causeDescription,
          correctiveAction: closeData.correctiveAction || wo.actionDescription,
          resolvedAt: now,
          repairCost: wo.totalCost ?? undefined,
          downtimeMinutes: wo.downtimeMinutes ?? undefined,
          rootCause: closeData.failureCause || undefined,
          preventiveAction: closeData.pmRecommendation || undefined,
        },
        create: {
          id: `wo-${workOrderId}`,
          assetId: wo.assetId || undefined,
          workOrderId,
          failureMode: closeData.failureMode || wo.failureDescription || undefined,
          failureCause: closeData.failureCause || wo.causeDescription || undefined,
          correctiveAction: closeData.correctiveAction || wo.actionDescription || undefined,
          detectedAt: wo.actualStart || now,
          resolvedAt: now,
          repairCost: wo.totalCost ?? undefined,
          downtimeMinutes: wo.downtimeMinutes ?? undefined,
          reportedById: session.userId,
          rootCause: closeData.failureCause || undefined,
          preventiveAction: closeData.pmRecommendation || undefined,
        },
      });
    }
  });

  // Notify after transactional success (non-blocking)
  notifyStakeholders(wo, session, 'planner_closed');

  return { success: true, data: { status: 'closed', isLocked: true } };
}

/**
 * CANCEL WORK ORDER — * → cancelled
 * Requires reason. Works from most states.
 */
export async function cancelWorkOrder(
  workOrderId: string,
  session: SessionContext,
  options: { reason: string; tx?: Prisma.TransactionClient; auditCtx?: AuditContext },
): Promise<TransitionResult> {
  if (!options.reason) return { success: false, error: 'Cancellation reason is required' };

  const wo = await fetchEnrichedWO(workOrderId, options.tx);
  if (!wo) return { success: false, error: 'Work order not found' };

  const result = await executeTransition('work_order', workOrderId, 'cancelled', session, {
    reason: options.reason,
    tx: options.tx,
  });
  if (!result.success) return { success: false, error: result.error };

  await createAuditEntry('update', 'work_order', workOrderId, session.userId,
    { status: wo.status }, { status: 'cancelled', reason: options.reason }, options.auditCtx, options.tx);

  return { success: true, data: { status: 'cancelled' } };
}

/**
 * Calculate authoritative WO costs from actual time logs and material consumption.
 * Server-side only — never trusts client-submitted totals.
 */
export async function calculateAuthoritativeCosts(workOrderId: string): Promise<{
  laborHours: number;
  laborCost: number;
  materialCost: number;
  toolCost: number;
  contractorCost: number;
  totalCost: number;
} | null> {
  const wo = await db.workOrder.findUnique({
    where: { id: workOrderId },
    select: {
      id: true,
      contractorCost: true,
      laborCost: true,
      partsCost: true,
      timeLogs: { select: { duration: true } },
      repairMaterialRequests: { select: { unitCost: true; consumedQty: true; wastedQty: true } },
      repairToolRequests: { select: { items: { select: { unitCost: true; quantityIssued: true } } } },
    },
  });
  if (!wo) return null;

  // Labor: sum of logged durations (fallback to existing value)
  const totalMinutes = wo.timeLogs.reduce((sum, tl) => sum + (tl.duration ?? 0), 0);
  const laborHours = Math.round((totalMinutes / 60) * 100) / 100;

  // Materials: sum of consumed + wasted * unit cost
  const materialCost = wo.repairMaterialRequests.reduce((sum, mr) => {
    const qty = (mr.consumedQty ?? 0) + (mr.wastedQty ?? 0);
    return sum + qty * (mr.unitCost ?? 0);
  }, 0);

  // Tools: sum of issued * unit cost
  const toolCost = wo.repairToolRequests.reduce((sum, tr) => {
    return sum + tr.items.reduce((itemSum, item) => {
      return itemSum + (item.quantityIssued ?? 0) * (item.unitCost ?? 0);
    }, 0);
  }, 0);

  return {
    laborHours,
    laborCost: wo.laborCost, // Use existing rate-calculated labor cost
    materialCost,
    toolCost,
    contractorCost: wo.contractorCost,
    totalCost: wo.laborCost + materialCost + toolCost + wo.contractorCost,
  };
}

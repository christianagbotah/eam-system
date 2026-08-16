/**
 * Work Execution Domain Service — Canonical WO lifecycle orchestration
 *
 * This is the SINGLE authoritative service for all WO status transitions
 * during execution. API routes MUST delegate to this service and NOT
 * duplicate readiness checks, team authority, state transitions, or audit.
 */

import { createHash } from 'crypto';
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
  auditCtx?: AuditContext;
  idempotencyKey?: string;
}

export interface WaitingStateOptions {
  reason?: string;
  auditCtx?: AuditContext;
  idempotencyKey?: string;
}

export interface HandoverOptions {
  reason?: string;
  auditCtx?: AuditContext;
  idempotencyKey?: string;
}

export interface CompletionOptions {
  notes?: string;
  failureDescription?: string;
  causeDescription?: string;
  actionDescription?: string;
  auditCtx?: AuditContext;
  idempotencyKey?: string;
}

export interface VerifyOptions {
  notes?: string;
  qualityRating?: number;
  checklistPassed?: boolean;
  auditCtx?: AuditContext;
  idempotencyKey?: string;
}

export interface ReworkOptions {
  reason: string;
  category?: string;
  evidence?: string[];
  auditCtx?: AuditContext;
  idempotencyKey?: string;
}

export interface CloseOptions {
  notes?: string;
  failureMode?: string;
  failureCause?: string;
  correctiveAction?: string;
  pmRecommendation?: string;
  followUpRequired?: boolean;
  followUpNotes?: string;
  auditCtx?: AuditContext;
  idempotencyKey?: string;
}

export interface CancelOptions {
  reason: string;
  auditCtx?: AuditContext;
  idempotencyKey?: string;
}

// ─── Authoritative Cost Result ───────────────────────────────────────────────

export interface AuthoritativeCostResult {
  plannedCost: number;
  actualLaborCost: number;
  actualMaterialCost: number;
  actualToolCost: number;
  actualContractorCost: number;
  totalActualCost: number;
  laborHours: number;
  incompleteLaborRate: boolean;
  toolCostNote?: string;
  warnings: string[];
}

// ─── Helper: Enriched WO used internally ────────────────────────────────────

type EnrichedWO = Awaited<ReturnType<typeof fetchEnrichedWO>>;

type TxClient = Prisma.TransactionClient;

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
    ).catch((err) => {
      console.error('[workExecution] Direct notification fallback also failed:', err);
    });
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

// ─── Helper: SHA-256 hash ────────────────────────────────────────────────────

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// ─── Idempotency: Check existing record ──────────────────────────────────────

async function checkIdempotency(
  key: string,
  tx?: Prisma.TransactionClient,
): Promise<{ found: boolean; responseData?: Record<string, unknown> }> {
  const client = tx ?? db;
  const record = await client.idempotencyRecord.findUnique({ where: { key } });
  if (!record) return { found: false };
  try {
    const data = record.responseData ? JSON.parse(record.responseData) : undefined;
    return { found: true, responseData: data as Record<string, unknown> };
  } catch {
    return { found: true, responseData: undefined };
  }
}

// ─── Idempotency: Record a response ──────────────────────────────────────────

async function recordIdempotency(
  key: string,
  entityType: string,
  entityId: string,
  action: string,
  userId: string,
  responseData: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? db;
  const responseJson = JSON.stringify(responseData);
  const responseHash = sha256(responseJson);
  await client.idempotencyRecord.create({
    data: {
      key,
      entityType,
      entityId,
      action,
      userId,
      responseHash,
      responseData: responseJson,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITATIVE COST CALCULATION (STEP 2)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate authoritative WO costs from actual time logs, material consumption,
 * tool damage charges, and contractor records. Server-side only — never trusts
 * client-submitted totals.
 *
 * @param workOrderId  The WO to calculate costs for
 * @param tx           Optional transaction client for use within a larger tx
 * @returns Structured cost breakdown with warnings for incomplete data
 */
export async function calculateAuthoritativeCosts(
  workOrderId: string,
  tx?: Prisma.TransactionClient,
): Promise<AuthoritativeCostResult | null> {
  const client = tx ?? db;

  const wo = await client.workOrder.findUnique({
    where: { id: workOrderId },
    select: {
      id: true,
      totalCost: true,
      laborCost: true,
      partsCost: true,
      contractorCost: true,
      estimatedHours: true,
      tradeActivity: true,
      assignedTo: true,
      timeLogs: {
        select: {
          id: true,
          userId: true,
          action: true,
          duration: true,
          startTime: true,
          endTime: true,
          breakMinutes: true,
        },
      },
      repairMaterialRequests: {
        select: { unitCost: true, consumedQty: true, wastedQty: true },
      },
      repairToolRequests: {
        select: {
          id: true,
          status: true,
          items: { select: { id: true, unitCost: true, quantityIssued: true } },
        },
      },
    },
  });
  if (!wo) return null;

  const warnings: string[] = [];

  // ── 1. Labor hours from time logs ──
  let laborHours = 0;

  // Strategy: prefer explicit `duration` field when set, else calculate from startTime/endTime.
  // Only consider actionable log entries (start, resume, complete) paired with their
  // corresponding end times. We iterate in chronological order.
  const sortedLogs = [...wo.timeLogs].sort(
    (a, b) => (a.startTime?.getTime() ?? a.timestamp.getTime()) - (b.startTime?.getTime() ?? b.timestamp.getTime()),
  );

  // For logs with explicit duration, sum those directly (in hours)
  let durationSum = 0;
  let durationCount = 0;

  // For logs without duration but with start/end, calculate
  let calculatedHours = 0;
  let calculatedCount = 0;

  for (const log of sortedLogs) {
    if (log.action === 'start' || log.action === 'resume') {
      // Prefer explicit duration
      if (log.duration != null && log.duration > 0) {
        durationSum += log.duration;
        durationCount++;
      } else if (log.startTime && log.endTime) {
        const elapsed = (log.endTime.getTime() - log.startTime.getTime()) / (1000 * 60 * 60);
        const breakDeduction = (log.breakMinutes ?? 0) / 60;
        calculatedHours += Math.max(0, elapsed - breakDeduction);
        calculatedCount++;
      }
    }
  }

  // Use duration sum if we have any; fall back to calculated
  if (durationCount > 0) {
    laborHours = Math.round(durationSum * 100) / 100;
  } else {
    laborHours = Math.round(calculatedHours * 100) / 100;
  }

  if (laborHours === 0 && wo.timeLogs.length > 0) {
    warnings.push('Labor hours resolved to 0 despite time log entries — check for missing duration/start/end data');
  }

  // ── 2. Labor cost: look for a configured rate ──
  let laborCost = 0;
  let incompleteLaborRate = true;

  // Attempt: Look up a Trade-level hourly rate via the user's primaryTrade.
  // The Trade model currently does NOT have an hourlyRate field.
  // Attempt: Look up a user-level rate — the User model also does NOT have one.
  // Since no rate field exists in the schema, laborCost is 0 with a flag.
  laborCost = 0;
  incompleteLaborRate = true;

  if (incompleteLaborRate) {
    warnings.push('No configured labor rate found — labor cost set to 0. Configure trade or user-level hourly rates to enable automatic labor cost calculation.');
  }

  // ── 3. Material cost: consumedQty + wastedQty × unitCost ──
  let materialCost = 0;
  for (const mr of wo.repairMaterialRequests) {
    const qty = (mr.consumedQty ?? 0) + (mr.wastedQty ?? 0);
    materialCost += qty * (mr.unitCost ?? 0);
  }
  materialCost = Math.round(materialCost * 100) / 100;

  // ── 4. Tool cost: only actual consumption charges ──
  // Normal reusable tool checkout is custody, NOT consumption.
  // Only include: rental charge, external hire, damage charge, consumable tooling, or depreciation.
  // Since the current schema has no such fields on RepairToolRequest, toolCost = 0.
  // (DamagedToolReport.actualRepairCost is tracked separately per tool, not per WO cost.)
  let toolCost = 0;
  const toolCostNote = 'Reusable tools in custody — no consumption cost';

  // ── 5. Contractor cost: from authorized server-side records ──
  // No Contractor model linked to WOs in the current schema.
  // Use the existing flat field on WorkOrder if set by an authorized process.
  let contractorCost = wo.contractorCost ?? 0;

  // ── 6. Planned cost (existing WO total before this calculation) ──
  const plannedCost = wo.totalCost ?? 0;

  // ── 7. Total actual ──
  const totalActualCost = Math.round((laborCost + materialCost + toolCost + contractorCost) * 100) / 100;

  return {
    plannedCost,
    actualLaborCost: laborCost,
    actualMaterialCost: materialCost,
    actualToolCost: toolCost,
    actualContractorCost: contractorCost,
    totalActualCost,
    laborHours,
    incompleteLaborRate,
    toolCostNote,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL EXECUTION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * START WORK — assigned → in_progress
 * Validates team membership, checks start readiness, creates time log, notifies.
 * Fully atomic: state transition + time log + audit in a single transaction.
 */
export async function startWork(
  workOrderId: string,
  session: SessionContext,
  options?: StartWorkOptions,
): Promise<TransitionResult> {
  const idempotencyKey = options?.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Team authority (read-only, outside tx)
  const auth = checkTeamAuthority(wo, session, 'start');
  if (!auth.allowed) return { success: false, error: auth.error };

  // Start readiness check (read-only, outside tx)
  const readiness = await checkReadiness(workOrderId, 'start');
  if (!readiness.ready) {
    return { success: false, error: 'Work order is not ready to start', readiness };
  }

  const now = new Date();

  let result: TransitionResult;

  // Execute state-changing operations atomically
  await db.$transaction(async (tx) => {
    // 1. State transition
    const transitionResult = await executeTransition('work_order', workOrderId, 'in_progress', session, {
      reason: options?.reason,
      extraData: { actualStart: now },
      tx,
    });
    if (!transitionResult.success) throw new Error(transitionResult.error);

    // 2. Create time log entry
    await tx.workOrderTimeLog.create({
      data: {
        workOrderId,
        userId: session.userId,
        action: 'start',
        notes: options?.notes || 'Work started',
        timestamp: now,
      },
    });

    // 3. Audit
    await createAuditEntry('update', 'work_order', workOrderId, session.userId,
      { status: wo.status }, { status: 'in_progress', actualStart: now.toISOString() }, options?.auditCtx, tx);
  });

  // Notify (non-blocking, queued)
  notifyStakeholders(wo, session, 'wo_started');

  result = { success: true, data: { status: 'in_progress', actualStart: now } };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, 'start', session.userId, result);
  }

  return result;
}

/**
 * PAUSE WORK — in_progress → on_hold
 * Fully atomic: close active timers + state transition + audit in a single transaction.
 */
export async function pauseWork(
  workOrderId: string,
  session: SessionContext,
  options?: WaitingStateOptions,
): Promise<TransitionResult> {
  const idempotencyKey = options?.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Team authority (read-only, outside tx)
  const auth = checkTeamAuthority(wo, session, 'pause');
  if (!auth.allowed) return { success: false, error: auth.error };

  // Execute state-changing operations atomically
  await db.$transaction(async (tx) => {
    // 1. Close any active time logs
    await tx.workOrderTimeLog.updateMany({
      where: { workOrderId, userId: session.userId, action: 'start', endTime: null },
      data: { endTime: new Date(), pauseReason: options?.reason || 'Work paused' },
    });

    // 2. State transition
    const result = await executeTransition('work_order', workOrderId, 'on_hold', session, {
      reason: options?.reason,
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // 3. Audit
    await createAuditEntry('update', 'work_order', workOrderId, session.userId,
      { status: wo.status }, { status: 'on_hold', pauseReason: options?.reason }, options?.auditCtx, tx);
  });

  sendRepairNotification({
    userId: wo.assignedSupervisorId || wo.plannerId || session.userId,
    event: 'wo_on_hold',
    woNumber: wo.woNumber, woId: wo.id,
    title: session.fullName, details: { reason: options?.reason },
  });

  const result: TransitionResult = { success: true, data: { status: 'on_hold' } };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, 'pause', session.userId, result);
  }

  return result;
}

/**
 * RESUME WORK — on_hold → in_progress
 * Fully atomic: state transition + time log + audit in a single transaction.
 */
export async function resumeWork(
  workOrderId: string,
  session: SessionContext,
  options?: WaitingStateOptions,
): Promise<TransitionResult> {
  const idempotencyKey = options?.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Team authority (read-only, outside tx)
  const auth = checkTeamAuthority(wo, session, 'start');
  if (!auth.allowed) return { success: false, error: auth.error };

  const now = new Date();

  // Execute state-changing operations atomically
  await db.$transaction(async (tx) => {
    // 1. State transition
    const result = await executeTransition('work_order', workOrderId, 'in_progress', session, {
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // 2. Create time log
    await tx.workOrderTimeLog.create({
      data: {
        workOrderId, userId: session.userId, action: 'resume',
        notes: options?.reason || 'Work resumed', timestamp: now,
      },
    });

    // 3. Audit
    await createAuditEntry('update', 'work_order', workOrderId, session.userId,
      { status: wo.status }, { status: 'in_progress' }, options?.auditCtx, tx);
  });

  const result: TransitionResult = { success: true, data: { status: 'in_progress' } };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, 'resume', session.userId, result);
  }

  return result;
}

/**
 * ENTER WAITING STATE — in_progress → waiting_parts|waiting_tools|waiting_shutdown|waiting_permit
 * Fully atomic: close active timers + state transition + audit in a single transaction.
 */
export async function enterWaitingState(
  workOrderId: string,
  session: SessionContext,
  waitingType: 'waiting_parts' | 'waiting_tools' | 'waiting_shutdown' | 'waiting_permit',
  options?: WaitingStateOptions,
): Promise<TransitionResult> {
  const idempotencyKey = options?.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Team authority (read-only, outside tx)
  const auth = checkTeamAuthority(wo, session, 'pause');
  if (!auth.allowed) return { success: false, error: auth.error };

  // Execute state-changing operations atomically
  await db.$transaction(async (tx) => {
    // 1. Close active time logs
    await tx.workOrderTimeLog.updateMany({
      where: { workOrderId, userId: session.userId, action: 'start', endTime: null },
      data: { endTime: new Date(), pauseReason: `Entered ${waitingType}` },
    });

    // 2. State transition
    const result = await executeTransition('work_order', workOrderId, waitingType, session, {
      reason: options?.reason,
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // 3. Audit
    await createAuditEntry('update', 'work_order', workOrderId, session.userId,
      { status: wo.status }, { status: waitingType, reason: options?.reason }, options?.auditCtx, tx);
  });

  const result: TransitionResult = { success: true, data: { status: waitingType } };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, `waiting:${waitingType}`, session.userId, result);
  }

  return result;
}

/**
 * INITIATE HANDOVER — in_progress → pending_handover
 * Fully atomic: state transition + audit in a single transaction.
 */
export async function initiateHandover(
  workOrderId: string,
  session: SessionContext,
  options?: HandoverOptions,
): Promise<TransitionResult> {
  const idempotencyKey = options?.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Team authority (read-only, outside tx)
  const auth = checkTeamAuthority(wo, session, 'handover');
  if (!auth.allowed) return { success: false, error: auth.error };

  // Execute state-changing operations atomically
  await db.$transaction(async (tx) => {
    // 1. State transition
    const result = await executeTransition('work_order', workOrderId, 'pending_handover', session, {
      reason: options?.reason,
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // 2. Audit
    await createAuditEntry('update', 'work_order', workOrderId, session.userId,
      { status: wo.status }, { status: 'pending_handover' }, options?.auditCtx, tx);
  });

  notifyStakeholders(wo, session, 'shift_handover_pending', undefined, options?.reason);

  const result: TransitionResult = { success: true, data: { status: 'pending_handover' } };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, 'handover', session.userId, result);
  }

  return result;
}

/**
 * RESUME AFTER HANDOVER — pending_handover → in_progress
 * Validates that a confirmed handover record exists for this WO.
 * Fully atomic: handover validation + state transition + time log + audit in a single transaction.
 */
export async function resumeAfterHandover(
  workOrderId: string,
  session: SessionContext,
  options?: HandoverOptions,
): Promise<TransitionResult> {
  const idempotencyKey = options?.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Team authority (read-only, outside tx)
  const auth = checkTeamAuthority(wo, session, 'start');
  if (!auth.allowed) return { success: false, error: auth.error };

  const now = new Date();

  // Execute state-changing operations atomically
  await db.$transaction(async (tx) => {
    // 1. Validate confirmed handover record exists (inside tx for consistency)
    const confirmedHandover = await tx.shiftHandover.findFirst({
      where: { workOrderId, status: 'confirmed' },
    });
    if (!confirmedHandover) {
      throw new Error(
        'Cannot resume work: no confirmed shift handover record exists for this work order. A valid handover must be confirmed before work can resume.',
      );
    }

    // 2. State transition
    const result = await executeTransition('work_order', workOrderId, 'in_progress', session, {
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // 3. Create time log
    await tx.workOrderTimeLog.create({
      data: {
        workOrderId, userId: session.userId, action: 'resume',
        notes: 'Resumed after shift handover', timestamp: now,
      },
    });

    // 4. Audit
    await createAuditEntry('update', 'work_order', workOrderId, session.userId,
      { status: wo.status }, { status: 'in_progress', handoverId: confirmedHandover.id }, options?.auditCtx, tx);
  });

  const result: TransitionResult = { success: true, data: { status: 'in_progress' } };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, 'resume_after_handover', session.userId, result);
  }

  return result;
}

/**
 * SUBMIT COMPLETION — in_progress → completed
 * Team leader only for multi-tech. Authoritative cost calculation. Readiness enforced.
 * Runs inside a transaction: status transition + time log + comment + audit + PM schedule update.
 * Client-submitted costs are NOT accepted — all costs are calculated server-side.
 */
export async function submitCompletion(
  workOrderId: string,
  session: SessionContext,
  completionData: CompletionOptions,
): Promise<TransitionResult> {
  const idempotencyKey = completionData.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Team authority
  const auth = checkTeamAuthority(wo, session, 'complete');
  if (!auth.allowed) return { success: false, error: auth.error };

  // Readiness check
  const readiness = await checkReadiness(workOrderId, 'complete');
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

  // Execute in a single transaction
  const txResult = await db.$transaction(async (tx) => {
    // 1. Calculate authoritative costs (server-side only)
    const costs = await calculateAuthoritativeCosts(workOrderId, tx);
    if (!costs) throw new Error('Failed to calculate authoritative costs: work order not found in transaction');

    const laborCost = costs.actualLaborCost;
    const partsCost = costs.actualMaterialCost;
    const contractorCost = costs.actualContractorCost;
    const totalCost = costs.totalActualCost;

    // 2. State transition
    const result = await executeTransition('work_order', workOrderId, 'completed', session, {
      extraData: {
        actualEnd: now,
        actualHours,
        failureDescription: completionData.failureDescription || wo.failureDescription,
        causeDescription: completionData.causeDescription || wo.causeDescription,
        actionDescription: completionData.actionDescription || wo.actionDescription,
        laborCost,
        partsCost,
        contractorCost,
        totalCost,
      },
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // 3. Create completion time log
    await tx.workOrderTimeLog.create({
      data: {
        workOrderId, userId: session.userId, action: 'complete',
        notes: completionData.notes || 'Work completed', timestamp: now,
      },
    });

    // 4. Create completion comment if notes provided
    if (completionData.notes) {
      await tx.workOrderComment.create({
        data: { workOrderId, userId: session.userId, content: completionData.notes },
      });
    }

    // 5. Audit
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

    // 6. PM Schedule: advance nextDueDate when a PM WO is completed
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

    return { costs, result };
  });

  // Notify after transactional success (non-blocking)
  notifyStakeholders(wo, session, 'completion_submitted');

  const result: TransitionResult = {
    success: true,
    data: {
      status: 'completed',
      actualEnd: now,
      actualHours,
      totalCost: txResult.costs.totalActualCost,
      ...(txResult.costs.incompleteLaborRate ? { costWarnings: txResult.costs.warnings } : {}),
    },
  };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, 'complete', session.userId, result);
  }

  return result;
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
  const idempotencyKey = options.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Readiness check
  const readiness = await checkReadiness(workOrderId, 'verify');
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

  const result: TransitionResult = { success: true, data: { status: 'verified' } };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, 'verify', session.userId, result);
  }

  return result;
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

  const idempotencyKey = reworkData.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
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

  const result: TransitionResult = { success: true, data: { status: 'in_progress', reworkReason: reworkData.reason } };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, 'rework', session.userId, result);
  }

  return result;
}

/**
 * PLANNER CLOSE — verified → closed
 * Validates closure readiness, locks WO, emits reliability event, KPI snapshot.
 * Full transaction: readiness check → transition → lock → audit → reliability event.
 * Authoritative costs are recalculated and written to the WO on close.
 */
export async function plannerClose(
  workOrderId: string,
  session: SessionContext,
  closeData: CloseOptions,
): Promise<TransitionResult> {
  const idempotencyKey = closeData.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Readiness check (read-only, outside tx)
  const readiness = await checkReadiness(workOrderId, 'close');
  if (!readiness.ready) {
    return { success: false, error: 'Work order is not ready for closure', readiness };
  }

  const now = new Date();

  // Execute in transaction
  await db.$transaction(async (tx) => {
    // 1. Calculate authoritative costs and write them to the WO
    const costs = await calculateAuthoritativeCosts(workOrderId, tx);
    if (costs) {
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          laborCost: costs.actualLaborCost,
          partsCost: costs.actualMaterialCost,
          contractorCost: costs.actualContractorCost,
          totalCost: costs.totalActualCost,
        },
      });
    }

    // 2. State transition
    const result = await executeTransition('work_order', workOrderId, 'closed', session, {
      extraData: {
        isLocked: true, lockedBy: session.userId, lockedAt: now, lockReason: 'Work order closed',
      },
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // 3. Lock the WO
    await tx.workOrder.update({
      where: { id: workOrderId },
      data: { isLocked: true, lockedBy: session.userId, lockedAt: now, lockReason: 'Planner closeout' },
    });

    // 4. Add closing comment if notes provided
    if (closeData.notes) {
      await tx.workOrderComment.create({
        data: { workOrderId, userId: session.userId, content: `[Closed] ${closeData.notes}` },
      });
    }

    // 5. Audit
    await tx.auditLog.create({
      data: {
        userId: session.userId, action: 'update', entityType: 'work_order', entityId: workOrderId,
        oldValues: JSON.stringify({ isLocked: wo.isLocked }),
        newValues: JSON.stringify({ isLocked: true }),
        ...(closeData.auditCtx?.ipAddress ? { ipAddress: closeData.auditCtx.ipAddress } : {}),
      },
    });

    // 6. Emit reliability event (within transaction — creates/updates FailureRecord)
    const finalCost = costs?.totalActualCost ?? wo.totalCost;
    if (wo.assetId || closeData.failureMode) {
      await tx.failureRecord.upsert({
        where: { id: `wo-${workOrderId}` },
        update: {
          failureMode: closeData.failureMode || wo.failureDescription,
          failureCause: closeData.failureCause || wo.causeDescription,
          correctiveAction: closeData.correctiveAction || wo.actionDescription,
          resolvedAt: now,
          repairCost: finalCost ?? undefined,
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
          repairCost: finalCost ?? undefined,
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

  const result: TransitionResult = { success: true, data: { status: 'closed', isLocked: true } };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, 'close', session.userId, result);
  }

  return result;
}

/**
 * CANCEL WORK ORDER — * → cancelled
 * Requires reason. Works from most states.
 * Fully atomic: state transition + audit in a single transaction.
 */
export async function cancelWorkOrder(
  workOrderId: string,
  session: SessionContext,
  options: CancelOptions,
): Promise<TransitionResult> {
  if (!options.reason) return { success: false, error: 'Cancellation reason is required' };

  const idempotencyKey = options.idempotencyKey;
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing.found && existing.responseData) {
      return existing.responseData as TransitionResult;
    }
  }

  const wo = await fetchEnrichedWO(workOrderId);
  if (!wo) return { success: false, error: 'Work order not found' };

  // Execute state-changing operations atomically
  await db.$transaction(async (tx) => {
    // 1. State transition
    const result = await executeTransition('work_order', workOrderId, 'cancelled', session, {
      reason: options.reason,
      tx,
    });
    if (!result.success) throw new Error(result.error);

    // 2. Audit
    await createAuditEntry('update', 'work_order', workOrderId, session.userId,
      { status: wo.status }, { status: 'cancelled', reason: options.reason }, options.auditCtx, tx);
  });

  const result: TransitionResult = { success: true, data: { status: 'cancelled' } };

  if (idempotencyKey) {
    await recordIdempotency(idempotencyKey, 'work_order', workOrderId, 'cancel', session.userId, result);
  }

  return result;
}
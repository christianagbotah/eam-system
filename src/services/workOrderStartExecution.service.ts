import { db } from '@/lib/db';
import { executeTransition } from '@/lib/state-machine';
import { checkReadiness, type ReadinessCheckResult } from '@/services/workOrderReadiness.service';
import { buildAuditData } from '@/lib/audit-helpers';
import { sendRepairNotification } from '@/lib/repair-notifications';

export interface StartExecutionSessionContext {
  userId: string;
  fullName?: string;
  roles: string[];
  permissions: string[];
}

export interface StartExecutionAuditContext {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  plantId?: string;
  departmentId?: string;
}

export interface StartExecutionOptions {
  reason?: string;
  notes?: string;
  auditCtx?: StartExecutionAuditContext;
}

export interface StartExecutionConflict {
  workOrderId: string;
  woNumber?: string;
  startedAt: string;
}

export type StartExecutionResult = {
  success: boolean;
  data?: { status: 'in_progress'; actualStart: Date };
  error?: string;
  readiness?: ReadinessCheckResult;
  conflict?: StartExecutionConflict;
};

class StartExecutionTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StartExecutionTransitionError';
  }
}

function hasStartAuthority(
  wo: {
    assignedTo: string | null;
    teamLeaderId: string | null;
    teamMembers: Array<{ userId: string; role: string }>;
  },
  session: StartExecutionSessionContext,
): boolean {
  if (session.roles.some((role) => ['admin', 'maintenance_manager', 'plant_manager'].includes(role))) {
    return true;
  }
  if (wo.assignedTo === session.userId || wo.teamLeaderId === session.userId) return true;
  return wo.teamMembers.some(
    (member) => member.userId === session.userId && member.role === 'team_leader',
  );
}

/**
 * Canonical assigned -> in_progress execution boundary.
 *
 * Authority, readiness, live-session conflict detection, status transition,
 * execution timer creation and audit are evaluated/committed through one
 * service boundary. The route may perform a fast pre-check for UX, but this
 * transactional check remains authoritative so direct callers cannot bypass it.
 */
export async function startWorkOrderExecution(
  workOrderId: string,
  session: StartExecutionSessionContext,
  options: StartExecutionOptions = {},
): Promise<StartExecutionResult> {
  const startedAt = new Date();

  const outcome = await db.$transaction(async (tx) => {
    const wo = await tx.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        id: true,
        woNumber: true,
        status: true,
        assignedTo: true,
        teamLeaderId: true,
        assignedSupervisorId: true,
        plannerId: true,
        teamMembers: { select: { userId: true, role: true } },
      },
    });
    if (!wo) return { success: false as const, error: 'Work order not found' };

    if (!hasStartAuthority(wo, session)) {
      return {
        success: false as const,
        error: 'Only the assigned technician, team leader, or maintenance manager can start this work order',
      };
    }

    const readiness = await checkReadiness(workOrderId, 'start', tx);
    if (!readiness.ready) {
      return {
        success: false as const,
        error: 'Work order is not ready to start',
        readiness,
      };
    }

    // Preserve the existing admin override semantics. For normal execution
    // users, a single live start/resume session is a system-wide invariant.
    if (!session.roles.includes('admin')) {
      const existingLiveSession = await tx.workOrderTimeLog.findFirst({
        where: {
          userId: session.userId,
          action: { in: ['start', 'resume'] },
          endTime: null,
        },
        orderBy: { timestamp: 'desc' },
        select: {
          workOrderId: true,
          startTime: true,
          timestamp: true,
          workOrder: { select: { woNumber: true } },
        },
      });

      if (existingLiveSession) {
        const existingStartedAt = existingLiveSession.startTime || existingLiveSession.timestamp;
        return {
          success: false as const,
          error: existingLiveSession.workOrderId === workOrderId
            ? 'You already have an active work session on this work order'
            : `You already have an active work session on WO #${existingLiveSession.workOrder?.woNumber || 'unknown'}. Stop or hand over that session before starting another work order.`,
          conflict: {
            workOrderId: existingLiveSession.workOrderId,
            woNumber: existingLiveSession.workOrder?.woNumber || undefined,
            startedAt: existingStartedAt.toISOString(),
          },
        };
      }
    }

    const transition = await executeTransition('work_order', workOrderId, 'in_progress', session, {
      reason: options.reason,
      extraData: { actualStart: startedAt },
      tx,
    });
    if (!transition.success) {
      throw new StartExecutionTransitionError(transition.error || 'Failed to start work order');
    }

    await tx.workOrderTimeLog.create({
      data: {
        workOrderId,
        userId: session.userId,
        action: 'start',
        notes: options.notes?.trim() || 'Work started',
        timestamp: startedAt,
        startTime: startedAt,
      },
    });

    await tx.auditLog.create({
      data: buildAuditData(
        'update',
        'work_order',
        workOrderId,
        session.userId,
        { status: wo.status },
        { status: 'in_progress', actualStart: startedAt.toISOString() },
        options.auditCtx,
      ),
    });

    return {
      success: true as const,
      data: { status: 'in_progress' as const, actualStart: startedAt },
      notify: {
        woNumber: wo.woNumber,
        assignedTo: wo.assignedTo,
        teamLeaderId: wo.teamLeaderId,
        assignedSupervisorId: wo.assignedSupervisorId,
        plannerId: wo.plannerId,
        teamMemberIds: wo.teamMembers.map((member) => member.userId),
      },
    };
  }).catch((error: unknown) => {
    if (error instanceof StartExecutionTransitionError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  });

  if (!outcome.success) return outcome;

  const recipients = new Set<string>();
  for (const userId of [
    outcome.notify.assignedTo,
    outcome.notify.teamLeaderId,
    outcome.notify.assignedSupervisorId,
    outcome.notify.plannerId,
    ...outcome.notify.teamMemberIds,
  ]) {
    if (userId && userId !== session.userId) recipients.add(userId);
  }

  for (const userId of recipients) {
    sendRepairNotification({
      userId,
      event: 'wo_started',
      woNumber: outcome.notify.woNumber,
      woId: workOrderId,
      title: session.fullName || 'Maintenance technician',
    });
  }

  return { success: true, data: outcome.data };
}

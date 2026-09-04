import { db } from '@/lib/db';
import { executeTransition } from '@/lib/state-machine';
import { checkReadiness, type ReadinessCheckResult } from '@/services/workOrderReadiness.service';
import { calculateAuthoritativeCosts } from '@/services/workExecution.service';
import { normalizeWorkOrderTimeLogs } from '@/services/workOrderTimeLogNormalization.service';
import { calculateNextDueDate, isAutoCalculableFrequency } from '@/lib/pm-utils';
import { sendRepairNotification } from '@/lib/repair-notifications';
import { buildAuditData } from '@/lib/audit-helpers';

export interface CompletionSessionContext {
  userId: string;
  fullName?: string;
  roles: string[];
  permissions: string[];
}

export interface CompletionAuditContext {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  plantId?: string;
  departmentId?: string;
}

export interface SubmitRepairCompletionOptions {
  notes?: string;
  failureDescription?: string;
  causeDescription?: string;
  actionDescription?: string;
  auditCtx?: CompletionAuditContext;
}

export type SubmitRepairCompletionResult = {
  success: boolean;
  data?: {
    status: 'completed';
    actualEnd: Date;
    actualHours: number;
    totalCost: number;
    costWarnings?: string[];
  };
  error?: string;
  readiness?: ReadinessCheckResult;
};

type CompletionWorkOrder = {
  id: string;
  woNumber: string;
  status: string;
  actualHours: number | null;
  failureDescription: string | null;
  causeDescription: string | null;
  actionDescription: string | null;
  assignedTo: string | null;
  teamLeaderId: string | null;
  assignedSupervisorId: string | null;
  plannerId: string | null;
  pmScheduleId: string | null;
  teamMembers: Array<{ userId: string; role: string }>;
  workOrderDowntimes: Array<{ durationMinutes: number }>;
};

function checkCompletionAuthority(
  wo: CompletionWorkOrder,
  session: CompletionSessionContext,
): { allowed: boolean; error?: string; isAdminOverride?: boolean } {
  const isAdminRole = session.roles.some((role) =>
    ['admin', 'maintenance_manager', 'plant_manager'].includes(role),
  );
  if (isAdminRole) return { allowed: true, isAdminOverride: true };

  const isAssignee = wo.assignedTo === session.userId;
  const isTeamLeader =
    wo.teamLeaderId === session.userId ||
    wo.teamMembers.some((member) => member.userId === session.userId && member.role === 'team_leader');

  const extraTeamMembers = new Set(
    wo.teamMembers
      .map((member) => member.userId)
      .filter((userId) => userId !== wo.assignedTo),
  );
  const isMultiTech = wo.assignedTo ? extraTeamMembers.size >= 1 : extraTeamMembers.size >= 2;

  if (isMultiTech) {
    return isTeamLeader
      ? { allowed: true }
      : { allowed: false, error: 'For multi-technician work orders, only the team leader can complete work' };
  }

  return isAssignee
    ? { allowed: true }
    : { allowed: false, error: 'Only the assigned technician can complete this work order' };
}

/**
 * Canonical technician/team-leader completion.
 *
 * Time-log normalization, readiness, authoritative cost calculation, status
 * transition, RepairCompletion snapshot, PM advancement, comments and audit are
 * committed in one transaction. A completed WorkOrder can therefore never be
 * persisted without the completion report required by supervisor verification.
 */
export async function submitRepairCompletion(
  workOrderId: string,
  session: CompletionSessionContext,
  options: SubmitRepairCompletionOptions,
): Promise<SubmitRepairCompletionResult> {
  const completedAt = new Date();

  const outcome = await db.$transaction(async (tx) => {
    const wo = await tx.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        id: true,
        woNumber: true,
        status: true,
        actualHours: true,
        failureDescription: true,
        causeDescription: true,
        actionDescription: true,
        assignedTo: true,
        teamLeaderId: true,
        assignedSupervisorId: true,
        plannerId: true,
        pmScheduleId: true,
        teamMembers: { select: { userId: true, role: true } },
        workOrderDowntimes: { select: { durationMinutes: true } },
      },
    });
    if (!wo) return { success: false as const, error: 'Work order not found' };

    const authority = checkCompletionAuthority(wo, session);
    if (!authority.allowed) {
      return { success: false as const, error: authority.error };
    }

    // Normalize legacy timestamp-only rows inside this transaction. This never
    // closes a genuinely active session; readiness below still blocks it.
    await normalizeWorkOrderTimeLogs(workOrderId, tx);

    const readiness = await checkReadiness(workOrderId, 'complete', tx);
    if (!readiness.ready) {
      return {
        success: false as const,
        error: 'Work order is not ready for completion',
        readiness,
      };
    }

    const costs = await calculateAuthoritativeCosts(workOrderId, tx);
    if (!costs) throw new Error('Failed to calculate authoritative costs during completion');

    const transition = await executeTransition('work_order', workOrderId, 'completed', session, {
      extraData: {
        actualEnd: completedAt,
        actualHours: costs.laborHours,
        failureDescription: options.failureDescription || wo.failureDescription,
        causeDescription: options.causeDescription || wo.causeDescription,
        actionDescription: options.actionDescription || wo.actionDescription,
        laborCost: costs.actualLaborCost,
        partsCost: costs.actualMaterialCost,
        contractorCost: costs.actualContractorCost,
        totalCost: costs.totalActualCost,
        laborRateApplied: costs.appliedLaborRate ?? undefined,
        laborCurrency: costs.appliedLaborCurrency ?? undefined,
      },
      tx,
    });
    if (!transition.success) throw new Error(transition.error);

    // Completion is a closed event row, not a live execution session.
    await tx.workOrderTimeLog.create({
      data: {
        workOrderId,
        userId: session.userId,
        action: 'complete',
        notes: options.notes || 'Work completed',
        timestamp: completedAt,
        startTime: completedAt,
        endTime: completedAt,
      },
    });

    if (options.notes?.trim()) {
      await tx.workOrderComment.create({
        data: {
          workOrderId,
          userId: session.userId,
          content: options.notes.trim(),
        },
      });
    }

    if (wo.pmScheduleId) {
      const pmSchedule = await tx.pmSchedule.findUnique({ where: { id: wo.pmScheduleId } });
      if (pmSchedule && pmSchedule.isActive && isAutoCalculableFrequency(pmSchedule.frequencyType)) {
        const nextDueDate = calculateNextDueDate(
          completedAt,
          pmSchedule.frequencyType,
          pmSchedule.frequencyValue,
        );
        await tx.pmSchedule.update({
          where: { id: pmSchedule.id },
          data: { lastCompletedDate: completedAt, nextDueDate },
        });
        await tx.auditLog.create({
          data: buildAuditData(
            'update',
            'pm_schedule',
            pmSchedule.id,
            session.userId,
            {
              lastCompletedDate: pmSchedule.lastCompletedDate,
              nextDueDate: pmSchedule.nextDueDate,
            },
            {
              lastCompletedDate: completedAt.toISOString(),
              nextDueDate: nextDueDate?.toISOString() ?? null,
              reason: `PM WO ${wo.woNumber} completed`,
            },
            options.auditCtx,
          ),
        });
      }
    }

    const totalDowntimeMinutes = Math.round(
      wo.workOrderDowntimes.reduce(
        (sum, downtime) => sum + (downtime.durationMinutes ?? 0),
        0,
      ),
    );
    const totalToolCost = Math.max(
      0,
      Math.round(
        (costs.totalActualCost
          - costs.actualLaborCost
          - costs.actualMaterialCost
          - costs.actualContractorCost) * 100,
      ) / 100,
    );

    await tx.repairCompletion.upsert({
      where: { workOrderId },
      create: {
        workOrderId,
        completionNotes: options.notes?.trim() || null,
        findings: options.failureDescription || wo.failureDescription || null,
        rootCause: options.causeDescription || wo.causeDescription || null,
        correctiveAction: options.actionDescription || wo.actionDescription || null,
        totalLaborHours: costs.laborHours,
        totalMaterialCost: costs.actualMaterialCost,
        totalToolCost,
        totalDowntimeMinutes,
        supervisorStatus: 'pending_review',
        plannerStatus: 'pending_closure',
      },
      update: {
        completionNotes: options.notes?.trim() || undefined,
        findings: options.failureDescription || wo.failureDescription || undefined,
        rootCause: options.causeDescription || wo.causeDescription || undefined,
        correctiveAction: options.actionDescription || wo.actionDescription || undefined,
        totalLaborHours: costs.laborHours,
        totalMaterialCost: costs.actualMaterialCost,
        totalToolCost,
        totalDowntimeMinutes,
        supervisorStatus: 'pending_review',
        supervisorApprovedById: null,
        supervisorApprovedAt: null,
        supervisorReviewNotes: null,
        plannerStatus: 'pending_closure',
        plannerClosedById: null,
        plannerClosedAt: null,
        closureNotes: null,
      },
    });

    await tx.auditLog.create({
      data: buildAuditData(
        'update',
        'work_order',
        workOrderId,
        session.userId,
        { status: wo.status, actualHours: wo.actualHours },
        {
          status: 'completed',
          actualEnd: completedAt.toISOString(),
          actualHours: costs.laborHours,
          laborCost: costs.actualLaborCost,
          partsCost: costs.actualMaterialCost,
          contractorCost: costs.actualContractorCost,
          totalCost: costs.totalActualCost,
          ...(authority.isAdminOverride ? { adminOverride: true } : {}),
        },
        options.auditCtx,
      ),
    });

    return {
      success: true as const,
      data: {
        status: 'completed' as const,
        actualEnd: completedAt,
        actualHours: costs.laborHours,
        totalCost: costs.totalActualCost,
        ...(costs.incompleteLaborRate ? { costWarnings: costs.warnings } : {}),
      },
      notify: {
        woNumber: wo.woNumber,
        assignedSupervisorId: wo.assignedSupervisorId,
        plannerId: wo.plannerId,
        teamLeaderId: wo.teamLeaderId,
      },
    };
  });

  if (!outcome.success) return outcome;

  const recipients = new Set(
    [outcome.notify.assignedSupervisorId, outcome.notify.plannerId, outcome.notify.teamLeaderId]
      .filter((userId): userId is string => Boolean(userId) && userId !== session.userId),
  );
  for (const userId of recipients) {
    sendRepairNotification({
      userId,
      event: 'completion_submitted',
      woNumber: outcome.notify.woNumber,
      woId: workOrderId,
      title: session.fullName || 'Maintenance technician',
    });
  }

  return { success: true, data: outcome.data };
}

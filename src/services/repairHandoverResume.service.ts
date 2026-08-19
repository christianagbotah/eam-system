import { db } from '@/lib/db';
import { executeTransition } from '@/lib/state-machine';
import type { SessionContext, TransitionResult } from '@/services/workExecution.service';
import type { Prisma } from '@prisma/client';

export interface ResumeConfirmedHandoverOptions {
  reason?: string;
}

/**
 * Resume a WO after a confirmed shift handover.
 *
 * Normal path: only the designated receivedById may resume.
 * Manager/admin override requires a reason. On successful normal resume,
 * execution authority is transferred to the receiver while preserving prior
 * team/history records.
 */
export async function resumeConfirmedHandover(
  workOrderId: string,
  session: SessionContext,
  options: ResumeConfirmedHandoverOptions = {},
): Promise<TransitionResult> {
  const wo = await db.workOrder.findUnique({
    where: { id: workOrderId },
    select: { id: true, status: true, assignedTo: true },
  });

  if (!wo) return { success: false, error: 'Work order not found' };
  if (wo.status !== 'pending_handover') {
    return { success: false, error: `Cannot resume after handover: work order status is '${wo.status}'` };
  }

  const now = new Date();
  let handoverId = '';
  let receiverId = '';

  try {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const handover = await tx.shiftHandover.findFirst({
        where: { workOrderId, status: 'confirmed' },
        orderBy: [{ confirmedAt: 'desc' }, { createdAt: 'desc' }],
      });

      if (!handover || !handover.receivedById) {
        throw new Error('Cannot resume work: no confirmed handover with a designated receiver exists');
      }

      handoverId = handover.id;
      receiverId = handover.receivedById;

      const isOverride = session.userId !== receiverId;
      const canOverride = session.roles.some((role) =>
        ['admin', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager'].includes(role),
      );

      if (isOverride && !canOverride) {
        throw new Error('Cannot resume work: only the designated handover receiver can resume work');
      }
      if (isOverride && !options.reason?.trim()) {
        throw new Error('Supervisor/manager override requires a reason');
      }

      const transition = await executeTransition('work_order', workOrderId, 'in_progress', session, { tx });
      if (!transition.success) throw new Error(transition.error || 'Failed to resume work order');

      // Preserve prior participants, but ensure the incoming receiver is present
      // in the team history and becomes the current execution lead.
      const existingMember = await tx.workOrderTeamMember.findFirst({
        where: { workOrderId, userId: receiverId },
        select: { id: true },
      });
      if (!existingMember) {
        await tx.workOrderTeamMember.create({
          data: {
            workOrderId,
            userId: receiverId,
            role: 'assistant',
            accessLevel: 'full',
            addedVia: 'shift_handover',
            assignedAt: now,
          },
        });
      }

      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { assignedTo: receiverId },
      });

      await tx.workOrderTimeLog.create({
        data: {
          workOrderId,
          userId: isOverride ? session.userId : receiverId,
          action: 'resume',
          notes: isOverride
            ? `Resumed after shift handover override: ${options.reason}`
            : 'Resumed after confirmed shift handover',
          timestamp: now,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: isOverride ? 'resume_after_handover_override' : 'resume_after_handover',
          entityType: 'work_order',
          entityId: workOrderId,
          oldValues: JSON.stringify({ status: wo.status, assignedTo: wo.assignedTo }),
          newValues: JSON.stringify({
            status: 'in_progress',
            handoverId,
            receivedById: receiverId,
            assignedTo: receiverId,
            ...(isOverride ? { overrideReason: options.reason } : {}),
          }),
        },
      });
    });
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to resume after handover' };
  }

  return {
    success: true,
    data: {
      status: 'in_progress',
      handoverId,
      assignedTo: receiverId,
    },
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { executeTransition } from '@/lib/state-machine';
import { calculateNextDueDate, isAutoCalculableFrequency } from '@/lib/pm-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      notes,
      failureDescription,
      causeDescription,
      actionDescription,
      laborCost,
      partsCost,
      contractorCost,
    } = body;

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Only the assigned technician or admin can complete
    if (wo.assignedTo !== session.userId && !session.roles.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Only the assigned technician or admin can complete work' },
        { status: 403 }
      );
    }

    const now = new Date();

    // Calculate actual hours if actualStart exists
    let actualHours = wo.actualHours;
    if (wo.actualStart) {
      const hours = (now.getTime() - new Date(wo.actualStart).getTime()) / (1000 * 60 * 60);
      actualHours = Math.round(hours * 100) / 100;
    }

    const totalCost =
      (laborCost ?? wo.laborCost) +
      (partsCost ?? wo.partsCost) +
      (contractorCost ?? wo.contractorCost);

    // Execute status transition via state machine (validates + updates status + creates history)
    const result = await executeTransition(
      'work_order',
      id,
      'completed',
      session,
      {
        extraData: {
          actualEnd: now,
          actualHours,
          failureDescription: failureDescription || wo.failureDescription,
          causeDescription: causeDescription || wo.causeDescription,
          actionDescription: actionDescription || wo.actionDescription,
          laborCost: laborCost ?? wo.laborCost,
          partsCost: partsCost ?? wo.partsCost,
          contractorCost: contractorCost ?? wo.contractorCost,
          totalCost,
        },
      },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Create time log
    await db.workOrderTimeLog.create({
      data: {
        workOrderId: id,
        userId: session.userId,
        action: 'complete',
        notes: notes || 'Work completed',
        timestamp: now,
      },
    });

    // Create completion comment if notes provided
    if (notes) {
      await db.workOrderComment.create({
        data: {
          workOrderId: id,
          userId: session.userId,
          content: notes,
        },
      });
    }

    // Domain-specific audit log (status change handled by state machine via WorkOrderStatusHistory)
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_order',
        entityId: id,
        oldValues: JSON.stringify({ actualEnd: null, actualHours: wo.actualHours }),
        newValues: JSON.stringify({
          actualEnd: now.toISOString(),
          actualHours,
        }),
      },
    });

    // Notify supervisors
    const notifyTargets = [wo.assignedSupervisorId, wo.teamLeaderId].filter(
      (uid): uid is string => !!uid && uid !== session.userId,
    );
    for (const targetId of notifyTargets) {
      await notifyUser(
        targetId,
        'wo_completed',
        'Work Order Completed',
        `${wo.woNumber} has been completed`,
        'work_order',
        id,
        `wo-detail?id=${id}`,
      );
    }

    // ── PM Schedule: advance nextDueDate when a PM WO is completed ──
    if (wo.pmScheduleId) {
      try {
        const pmSchedule = await db.pmSchedule.findUnique({
          where: { id: wo.pmScheduleId },
        });

        if (pmSchedule && pmSchedule.isActive && isAutoCalculableFrequency(pmSchedule.frequencyType)) {
          const newNextDueDate = calculateNextDueDate(
            now, // start from completion date
            pmSchedule.frequencyType,
            pmSchedule.frequencyValue,
          );

          await db.pmSchedule.update({
            where: { id: pmSchedule.id },
            data: {
              lastCompletedDate: now,
              nextDueDate: newNextDueDate,
            },
          });

          // Audit log for schedule update
          await db.auditLog.create({
            data: {
              userId: session.userId,
              action: 'update',
              entityType: 'pm_schedule',
              entityId: pmSchedule.id,
              oldValues: JSON.stringify({
                lastCompletedDate: pmSchedule.lastCompletedDate,
                nextDueDate: pmSchedule.nextDueDate,
              }),
              newValues: JSON.stringify({
                lastCompletedDate: now.toISOString(),
                nextDueDate: newNextDueDate?.toISOString() ?? null,
                reason: `PM WO ${wo.woNumber} completed`,
              }),
            },
          });
        }
      } catch (pmErr) {
        // Don't fail the WO completion if PM schedule update fails
        console.error('[PM Schedule Update Error] Failed to update nextDueDate:', pmErr);
      }
    }

    // Re-fetch with includes to return full object (state machine returns plain record)
    const updated = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin, hasRole } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { executeTransition } from '@/lib/state-machine';
import { calculateNextDueDate, isAutoCalculableFrequency } from '@/lib/pm-utils';
import { checkReadiness } from '@/services/workOrderReadiness.service';
import { extractAuditContext, buildAuditData } from '@/lib/audit-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.complete') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
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

    const wo = await db.workOrder.findUnique({
      where: { id },
      include: { teamMembers: { select: { userId: true, role: true } } },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // ── P2L: Readiness check before completion ──
    const readiness = await checkReadiness(id, 'complete');
    if (!readiness.ready) {
      return NextResponse.json({
        success: false,
        error: 'Work order is not ready for completion',
        blockers: readiness.blockers,
      }, { status: 422 });
    }

    // ── Team Execution Governance: completion authority ──
    // Count team members excluding the assignedTo user if they're also a member
    const teamMemberIds = (wo.teamMembers || [])
      .map((m) => m.userId)
      .filter((uid) => uid !== wo.assignedTo);
    const distinctTeamCount = new Set(teamMemberIds).size;
    const isMultiTech = distinctTeamCount >= 2;

    const isAssignee = wo.assignedTo === session.userId;
    const isTeamLeaderByMember = wo.teamMembers?.some((m) => m.userId === session.userId && m.role === 'team_leader') || false;
    const isTeamLeader = wo.teamLeaderId === session.userId || isTeamLeaderByMember;
    const isManagerOverride = isAdmin(session) || hasRole(session, 'maintenance_manager');

    if (isMultiTech) {
      // Multi-tech WO: only team leader or admin/manager can complete
      if (!isTeamLeader && !isManagerOverride) {
        return NextResponse.json(
          { success: false, error: 'For multi-technician work orders, only the team leader can complete work' },
          { status: 403 }
        );
      }
    } else {
      // Single-tech WO: only the assigned technician or admin/manager can complete
      if (!isAssignee && !isManagerOverride) {
        return NextResponse.json(
          { success: false, error: 'Only the assigned technician can complete this work order' },
          { status: 403 }
        );
      }
    }

    const isAdminOverride = isManagerOverride && !isAssignee && !(isMultiTech && isTeamLeader);

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

    // ── P2R: Domain-specific audit log with full context ──
    const auditCtx = extractAuditContext(request);
    await db.auditLog.create({
      data: buildAuditData(
        'update',
        'work_order',
        id,
        session.userId,
        { actualEnd: null, actualHours: wo.actualHours },
        {
          actualEnd: now.toISOString(),
          actualHours,
          ...(isAdminOverride ? { adminOverride: true } : {}),
        },
        auditCtx,
      ),
    });

    // Notify supervisors and planner (force SMS for critical workflow step)
    const notifyTargets = [wo.assignedSupervisorId, wo.teamLeaderId, wo.plannerId].filter(
      (uid): uid is string => !!uid && uid !== session.userId,
    );
    for (const targetId of notifyTargets) {
      await notifyUser(
        targetId,
        'wo_completed',
        'Work Order Completed',
        `${session.fullName} completed ${wo.woNumber}: "${wo.title}"`,
        'work_order',
        id,
        `wo-detail?id=${id}`,
        { forceSms: true },
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

          // Audit log for schedule update (with audit context)
          await db.auditLog.create({
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
                lastCompletedDate: now.toISOString(),
                nextDueDate: newNextDueDate?.toISOString() ?? null,
                reason: `PM WO ${wo.woNumber} completed`,
              },
              auditCtx,
            ),
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

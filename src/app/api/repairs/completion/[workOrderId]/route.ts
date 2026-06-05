import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { createAuditLog } from '@/lib/audit';

// GET /api/repairs/completion/[workOrderId]
export async function GET(request: NextRequest, { params }: { params: Promise<{ workOrderId: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { workOrderId } = await params;
    const completion = await db.repairCompletion.findUnique({
      where: { workOrderId },
      include: {
        supervisorApprovedBy: { select: { id: true, fullName: true } },
        plannerClosedBy: { select: { id: true, fullName: true } },
        workOrder: {
          select: {
            id: true,
            woNumber: true,
            title: true,
            status: true,
            isLocked: true,
            lockReason: true,
            lockedBy: { select: { id: true, fullName: true } },
            assignedSupervisor: { select: { id: true, fullName: true } },
            planner: { select: { id: true, fullName: true } },
            assignedTo: { select: { id: true, fullName: true, avatar: true } },
          },
        },
      },
    });

    if (!completion) return NextResponse.json({ success: false, error: 'Completion record not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: completion });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load completion record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/completion/[workOrderId] — create/update or workflow action
export async function POST(request: NextRequest, { params }: { params: Promise<{ workOrderId: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { workOrderId } = await params;
    const body = await request.json();
    const { action, completionNotes, findings, rootCause, correctiveAction, materialsUsedSummary, toolsUsedSummary, totalLaborHours, totalMaterialCost, totalToolCost, totalDowntimeMinutes, supervisorReviewNotes, reworkReason, closureNotes } = body;

    // Role-based access for workflow actions
    if (action === 'supervisor_approve' || action === 'supervisor_request_rework') {
      if (!isAdmin(session) && !hasRole(session, 'maintenance_supervisor') && !hasRole(session, 'maintenance_manager') && !hasRole(session, 'maintenance_planner')) {
        return NextResponse.json({ success: false, error: 'Only supervisors, managers, or planners can perform this action' }, { status: 403 });
      }
    }
    if (action === 'planner_close') {
      if (!isAdmin(session) && !hasRole(session, 'maintenance_planner') && !hasRole(session, 'maintenance_manager')) {
        return NextResponse.json({ success: false, error: 'Only planners or managers can close work orders' }, { status: 403 });
      }
    }

    const wo = await db.workOrder.findUnique({
      where: { id: workOrderId },
      include: { assignedSupervisor: { select: { id: true, fullName: true } }, planner: { select: { id: true, fullName: true } }, assignee: { select: { id: true, fullName: true } }, teamMembers: { select: { userId: true } } },
    });
    if (!wo) return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });

    // ── IMMUTABILITY CHECK ──
    // After planner_close, the WO is permanently locked. No mutations allowed.
    // This is non-negotiable — even admin cannot override a planner-closed work order.
    if (wo.isLocked) {
      return NextResponse.json({
        success: false,
        error: `Work order is permanently locked${wo.lockReason ? ` (${wo.lockReason})` : ''}. No modifications are allowed by anyone, including administrators. The work order has been completed and archived by the planner.`,
        isLocked: true,
      }, { status: 403 });
    }

    const now = new Date();

    // Submit completion (technician)
    if (action === 'submit' || action === undefined) {
      // Only WO assignee or team leader can submit completion
      const isAssignee = wo.assignedToId === session.userId;
      const isTeamLeader = wo.teamLeaderId === session.userId;
      const isTeamMember = wo.teamMembers?.some((m) => m.userId === session.userId) || false;
      if (!isAssignee && !isTeamLeader && !isTeamMember && !isAdmin(session)) {
        return NextResponse.json({ success: false, error: 'Only the assigned technician, team leader, or team member can submit completion' }, { status: 403 });
      }

      // Calculate totals from time logs
      const timeLogs = await db.workOrderTimeLog.findMany({ where: { workOrderId } });
      let calculatedLaborHours = 0;
      for (const tl of timeLogs) {
        if (tl.action === 'start' || tl.action === 'resume' || tl.action === 'complete') {
          calculatedLaborHours += (tl.duration || 0);
        }
      }

      // Check if technician has logged time (warning only, allow submission)
      const hasTimeLogs = timeLogs.length > 0;
      const hasDuration = timeLogs.some((tl) => tl.duration && tl.duration > 0);

      // Calculate downtime
      const downtimes = await db.workOrderDowntime.findMany({ where: { workOrderId } });
      const calculatedDowntime = downtimes.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);

      const completion = await db.repairCompletion.upsert({
        where: { workOrderId },
        create: {
          workOrderId,
          completionNotes: completionNotes || null,
          findings: findings || null,
          rootCause: rootCause || null,
          correctiveAction: correctiveAction || null,
          materialsUsedSummary: materialsUsedSummary || '[]',
          toolsUsedSummary: toolsUsedSummary || '[]',
          totalLaborHours: totalLaborHours || calculatedLaborHours,
          totalMaterialCost: totalMaterialCost || 0,
          totalToolCost: totalToolCost || 0,
          totalDowntimeMinutes: totalDowntimeMinutes || calculatedDowntime,
          supervisorStatus: 'pending_review',
          plannerStatus: 'pending_closure',
        },
        update: {
          completionNotes: completionNotes || undefined,
          findings: findings || undefined,
          rootCause: rootCause || undefined,
          correctiveAction: correctiveAction || undefined,
          materialsUsedSummary: materialsUsedSummary || undefined,
          toolsUsedSummary: toolsUsedSummary || undefined,
          totalLaborHours: totalLaborHours || calculatedLaborHours,
          totalMaterialCost: totalMaterialCost || undefined,
          totalToolCost: totalToolCost || undefined,
          totalDowntimeMinutes: totalDowntimeMinutes || calculatedDowntime,
          ...(reworkReason ? { reworkReason, reworkCount: { increment: 1 } } : {}),
          supervisorStatus: 'pending_review',
        },
        include: {
          supervisorApprovedBy: { select: { id: true, fullName: true } },
          workOrder: { select: { id: true, woNumber: true } },
        },
      });

      // Update WO status to completed
      await db.workOrder.update({
        where: { id: workOrderId },
        data: { status: 'completed', actualEnd: now, actualHours: completion.totalLaborHours },
      });

      // Create status history
      await db.workOrderStatusHistory.create({
        data: { workOrderId, fromStatus: wo.status, toStatus: 'completed', performedById: session.userId, notes: 'Technician submitted completion' },
      });

      // Notify supervisor (force SMS for critical workflow step)
      if (wo.assignedSupervisorId) {
        await notifyUser(wo.assignedSupervisorId, 'wo_completed', 'Work Order Completed - Review Required', `WO ${wo.woNumber} has been completed by technician. Your review is required.`, 'work_order', workOrderId, 'maintenance-work-orders', { forceSms: true });
      }

      await createAuditLog(session.userId, 'RepairCompletion', 'submit_completion', completion.id, {
        newValues: { workOrderId, status: 'completed' },
      });

      return NextResponse.json({
        success: true,
        data: completion,
        warnings: !hasTimeLogs || !hasDuration
          ? ['No time has been logged for this work order. Consider logging time for accurate records.']
          : undefined,
      });
    }

    // Supervisor approval
    if (action === 'supervisor_approve') {
      let completion = await db.repairCompletion.findUnique({ where: { workOrderId } });
      if (!completion) return NextResponse.json({ success: false, error: 'Completion record not found. Submit completion first.' }, { status: 400 });
      if (completion.supervisorStatus !== 'pending_review') return NextResponse.json({ success: false, error: `Cannot approve: supervisor status is ${completion.supervisorStatus}` }, { status: 400 });

      completion = await db.repairCompletion.update({
        where: { workOrderId },
        data: { supervisorStatus: 'approved', supervisorApprovedById: session.userId, supervisorApprovedAt: now, supervisorReviewNotes: supervisorReviewNotes || null },
      });

      // Update WO status to verified
      await db.workOrder.update({ where: { id: workOrderId }, data: { status: 'verified' } });
      await db.workOrderStatusHistory.create({ data: { workOrderId, fromStatus: wo.status, toStatus: 'verified', performedById: session.userId, notes: 'Supervisor approved completion' } });

      // Notify planner (force SMS for critical workflow step)
      if (wo.plannerId) {
        await notifyUser(wo.plannerId, 'wo_completed', 'Work Order Ready for Closure', `WO ${wo.woNumber} has been supervisor-approved. Ready for final closure.`, 'work_order', workOrderId, 'maintenance-work-orders', { forceSms: true });
      }

      await createAuditLog(session.userId, 'RepairCompletion', 'supervisor_approve_completion', completion.id, {
        newValues: { supervisorStatus: 'approved' },
      });

      return NextResponse.json({ success: true, data: completion });
    }

    // Supervisor requests rework
    if (action === 'supervisor_request_rework') {
      if (!reworkReason) return NextResponse.json({ success: false, error: 'reworkReason is required for rework request' }, { status: 400 });

      let completion = await db.repairCompletion.findUnique({ where: { workOrderId } });
      if (!completion) return NextResponse.json({ success: false, error: 'Completion record not found' }, { status: 400 });
      if (completion.supervisorStatus !== 'pending_review') return NextResponse.json({ success: false, error: `Cannot request rework: status is ${completion.supervisorStatus}` }, { status: 400 });

      completion = await db.repairCompletion.update({
        where: { workOrderId },
        data: { supervisorStatus: 'rework_requested', reworkReason, supervisorReviewNotes, reworkCount: { increment: 1 } },
      });

      // Set WO back to in_progress
      await db.workOrder.update({ where: { id: workOrderId }, data: { status: 'in_progress' } });
      await db.workOrderStatusHistory.create({ data: { workOrderId, fromStatus: wo.status, toStatus: 'in_progress', performedById: session.userId, notes: `Rework requested: ${reworkReason}` } });

      // Notify technician (force SMS for critical workflow step)
      if (wo.assignedTo) {
        await notifyUser(wo.assignedTo, 'wo_rework', 'Rework Requested', `WO ${wo.woNumber}: ${reworkReason}`, 'work_order', workOrderId, 'maintenance-work-orders', { forceSms: true });
      }

      await createAuditLog(session.userId, 'RepairCompletion', 'supervisor_request_rework', completion.id, {
        newValues: { supervisorStatus: 'rework_requested', reworkReason },
      });

      return NextResponse.json({ success: true, data: completion });
    }

    // Planner closure
    if (action === 'planner_close') {
      let completion = await db.repairCompletion.findUnique({ where: { workOrderId } });
      if (!completion) return NextResponse.json({ success: false, error: 'Completion record not found' }, { status: 400 });
      if (completion.supervisorStatus !== 'approved') return NextResponse.json({ success: false, error: 'Cannot close: supervisor has not approved yet' }, { status: 400 });

      // Perform planner_close with WO immutability (lock)
      const [updatedCompletion] = await db.$transaction([
        // Update completion record
        db.repairCompletion.update({
          where: { workOrderId },
          data: { plannerStatus: 'closed', plannerClosedById: session.userId, plannerClosedAt: now, closureNotes: closureNotes || null },
        }),
        // Close WO and LOCK it (immutability)
        db.workOrder.update({
          where: { id: workOrderId },
          data: {
            status: 'closed',
            isLocked: true,
            lockedBy: session.userId,
            lockedAt: now,
            lockReason: 'Closed by planner — work order is now immutable',
            laborCost: completion.totalLaborHours * (Number(process.env.DEFAULT_LABOR_RATE_HOURS) || 50),
            partsCost: completion.totalMaterialCost,
          },
        }),
      ]);

      await db.workOrderStatusHistory.create({
        data: { workOrderId, fromStatus: wo.status, toStatus: 'closed', performedById: session.userId, notes: 'Planner closed work order — locked for immutability' },
      });

      // Notify all parties (force SMS for critical workflow step)
      const notifyUsers = [wo.assignedTo, wo.assignedSupervisorId].filter(Boolean) as string[];
      for (const uid of notifyUsers) {
        await notifyUser(uid, 'wo_closed', 'Work Order Closed', `WO ${wo.woNumber} has been closed by planner and locked.`, 'work_order', workOrderId, undefined, { forceSms: true });
      }

      await createAuditLog(session.userId, 'RepairCompletion', 'planner_close_completion', updatedCompletion.id, {
        newValues: { plannerStatus: 'closed', isLocked: true, lockReason: 'Closed by planner' },
      });

      return NextResponse.json({ success: true, data: updatedCompletion });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process completion action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

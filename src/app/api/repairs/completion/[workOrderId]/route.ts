import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/repairs/completion/[workOrderId]
export async function GET(request: NextRequest, { params }: { params: Promise<{ workOrderId: string }> }) {
  try {
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
            assignedSupervisor: { select: { id: true, fullName: true } },
            planner: { select: { id: true, fullName: true } },
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

    const wo = await db.workOrder.findUnique({
      where: { id: workOrderId },
      include: { assignedSupervisor: { select: { id: true, fullName: true } }, planner: { select: { id: true, fullName: true } }, assignee: { select: { id: true, fullName: true } } },
    });
    if (!wo) return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });

    const now = new Date();

    // Submit completion (technician)
    if (action === 'submit' || action === undefined) {
      // Calculate totals from time logs
      const timeLogs = await db.workOrderTimeLog.findMany({ where: { workOrderId } });
      let calculatedLaborHours = 0;
      for (const tl of timeLogs) {
        if (tl.action === 'start' || tl.action === 'resume' || tl.action === 'complete') {
          calculatedLaborHours += 0.5; // simplified
        }
      }

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

      // Notify supervisor
      if (wo.assignedSupervisorId) {
        await db.notification.create({
          data: { userId: wo.assignedSupervisorId, type: 'wo_completed', title: 'Work Order Completed - Review Required', message: `WO ${wo.woNumber} has been completed by technician. Your review is required.`, entityType: 'work_order', entityId: workOrderId, actionUrl: 'maintenance-work-orders' },
        });
      }

      await db.auditLog.create({
        data: { userId: session.userId, action: 'submit_completion', entityType: 'repair_completion', entityId: completion.id, newValues: JSON.stringify({ workOrderId, status: 'completed' }) },
      });

      return NextResponse.json({ success: true, data: completion });
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

      // Notify planner
      if (wo.plannerId) {
        await db.notification.create({
          data: { userId: wo.plannerId, type: 'wo_completed', title: 'Work Order Ready for Closure', message: `WO ${wo.woNumber} has been supervisor-approved. Ready for final closure.`, entityType: 'work_order', entityId: workOrderId, actionUrl: 'maintenance-work-orders' },
        });
      }

      await db.auditLog.create({
        data: { userId: session.userId, action: 'supervisor_approve_completion', entityType: 'repair_completion', entityId: completion.id, newValues: JSON.stringify({ supervisorStatus: 'approved' }) },
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

      // Notify technician
      if (wo.assignedTo) {
        await db.notification.create({
          data: { userId: wo.assignedTo, type: 'wo_rework', title: 'Rework Requested', message: `WO ${wo.woNumber}: ${reworkReason}`, entityType: 'work_order', entityId: workOrderId, actionUrl: 'maintenance-work-orders' },
        });
      }

      await db.auditLog.create({
        data: { userId: session.userId, action: 'supervisor_request_rework', entityType: 'repair_completion', entityId: completion.id, newValues: JSON.stringify({ supervisorStatus: 'rework_requested', reworkReason }) },
      });

      return NextResponse.json({ success: true, data: completion });
    }

    // Planner closure
    if (action === 'planner_close') {
      let completion = await db.repairCompletion.findUnique({ where: { workOrderId } });
      if (!completion) return NextResponse.json({ success: false, error: 'Completion record not found' }, { status: 400 });
      if (completion.supervisorStatus !== 'approved') return NextResponse.json({ success: false, error: 'Cannot close: supervisor has not approved yet' }, { status: 400 });

      completion = await db.repairCompletion.update({
        where: { workOrderId },
        data: { plannerStatus: 'closed', plannerClosedById: session.userId, plannerClosedAt: now, closureNotes: closureNotes || null },
      });

      // Close WO
      await db.workOrder.update({
        where: { id: workOrderId },
        data: { status: 'closed', laborCost: completion.totalLaborHours * 50, partsCost: completion.totalMaterialCost },
      });
      await db.workOrderStatusHistory.create({ data: { workOrderId, fromStatus: wo.status, toStatus: 'closed', performedById: session.userId, notes: 'Planner closed work order' } });

      // Notify all parties
      const notifyUsers = [wo.assignedTo, wo.assignedSupervisorId].filter(Boolean) as string[];
      for (const uid of notifyUsers) {
        await db.notification.create({
          data: { userId: uid, type: 'wo_closed', title: 'Work Order Closed', message: `WO ${wo.woNumber} has been closed by planner.`, entityType: 'work_order', entityId: workOrderId },
        });
      }

      await db.auditLog.create({
        data: { userId: session.userId, action: 'planner_close_completion', entityType: 'repair_completion', entityId: completion.id, newValues: JSON.stringify({ plannerStatus: 'closed' }) },
      });

      return NextResponse.json({ success: true, data: completion });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process completion action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

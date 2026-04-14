import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { executeTransition } from '@/lib/state-machine';

/**
 * POST /api/work-orders/[id]/cancel
 *
 * Cancels a work order (draft/requested/approved → cancelled).
 * Always requires a reason (configured in transition rules).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.cancel') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'A reason is required to cancel a work order' },
        { status: 400 }
      );
    }

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Only allow cancellation from non-terminal states
    const cancellableStates = ['draft', 'requested', 'approved', 'planned', 'assigned', 'on_hold'];
    if (!cancellableStates.includes(wo.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot cancel a work order in "${wo.status}" status. Only ${cancellableStates.join(', ')} can be cancelled.` },
        { status: 400 }
      );
    }

    const result = await executeTransition(
      'work_order',
      id,
      'cancelled',
      session,
      { reason, extraData: { notes: `[Cancelled] ${reason}` } },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Create time log
    await db.workOrderTimeLog.create({
      data: {
        workOrderId: id,
        userId: session.userId,
        action: 'cancel',
        notes: reason,
        timestamp: new Date(),
      },
    });

    // Notify all team members and requester
    const notifyTargets: string[] = [];

    // Add team members
    const teamMembers = await db.workOrderTeamMember.findMany({
      where: { workOrderId: id },
      select: { userId: true },
    });
    for (const member of teamMembers) {
      if (member.userId !== session.userId && !notifyTargets.includes(member.userId)) {
        notifyTargets.push(member.userId);
      }
    }

    // Add assignee
    if (wo.assignedTo && wo.assignedTo !== session.userId && !notifyTargets.includes(wo.assignedTo)) {
      notifyTargets.push(wo.assignedTo);
    }

    // Add requester from linked MR
    if (wo.maintenanceRequestId) {
      const linkedMR = await db.maintenanceRequest.findUnique({
        where: { id: wo.maintenanceRequestId },
        select: { requestedBy: true },
      });
      if (linkedMR?.requestedBy && linkedMR.requestedBy !== session.userId && !notifyTargets.includes(linkedMR.requestedBy)) {
        notifyTargets.push(linkedMR.requestedBy);
      }
    }

    for (const targetId of notifyTargets) {
      await notifyUser(
        targetId,
        'wo_cancelled',
        'Work Order Cancelled',
        `${wo.woNumber} has been cancelled. Reason: ${reason}`,
        'work_order',
        id,
        `wo-detail?id=${id}`,
      );
    }

    // Re-fetch with includes
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
    const message = error instanceof Error ? error.message : 'Failed to cancel work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

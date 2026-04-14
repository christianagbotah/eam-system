import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { executeTransition } from '@/lib/state-machine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['work_orders.update', 'work_orders.close', 'work_orders.*'])) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to close work order' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const now = new Date();

    // Execute status transition via state machine (validates + updates status + creates history)
    const result = await executeTransition(
      'work_order',
      id,
      'closed',
      session,
      {
        extraData: {
          isLocked: true,
          lockedBy: session.userId,
          lockedAt: now,
          lockReason: 'Work order closed',
        },
      },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Add closing comment if notes provided
    if (notes) {
      await db.workOrderComment.create({
        data: {
          workOrderId: id,
          userId: session.userId,
          content: `[Closed] ${notes}`,
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
        oldValues: JSON.stringify({ isLocked: wo.isLocked }),
        newValues: JSON.stringify({ isLocked: true }),
      },
    });

    // Notify assigned user, requester (from linked MR), and all team members
    const notifyTargets: string[] = [];
    if (wo.assignedTo && wo.assignedTo !== session.userId) {
      notifyTargets.push(wo.assignedTo);
    }
    // Look up the linked MR's requester
    if (wo.maintenanceRequestId) {
      const linkedMR = await db.maintenanceRequest.findUnique({
        where: { id: wo.maintenanceRequestId },
        select: { requestedBy: true },
      });
      if (linkedMR?.requestedBy && linkedMR.requestedBy !== session.userId && !notifyTargets.includes(linkedMR.requestedBy)) {
        notifyTargets.push(linkedMR.requestedBy);
      }
    }
    // Add all team members
    const teamMembers = await db.workOrderTeamMember.findMany({
      where: { workOrderId: id },
      select: { userId: true },
    });
    for (const member of teamMembers) {
      if (member.userId !== session.userId && !notifyTargets.includes(member.userId)) {
        notifyTargets.push(member.userId);
      }
    }
    for (const targetId of notifyTargets) {
      await notifyUser(
        targetId,
        'wo_closed',
        'Work Order Closed',
        `${wo.woNumber} has been closed`,
        'work_order',
        id,
        `wo-detail?id=${id}`,
      );
    }

    // Re-fetch with includes to return full object (state machine returns plain record)
    const updated = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        locker: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to close work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

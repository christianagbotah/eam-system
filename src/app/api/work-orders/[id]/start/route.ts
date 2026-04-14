import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
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

    if (!hasPermission(session, 'work_orders.start') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Only the assigned technician or admin can start work
    if (wo.assignedTo !== session.userId && !session.roles.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Only the assigned technician or admin can start work' },
        { status: 403 }
      );
    }

    const now = new Date();

    // Execute status transition via state machine (validates + updates status + creates history)
    const result = await executeTransition(
      'work_order',
      id,
      'in_progress',
      session,
      { extraData: { actualStart: now } },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Create time log entry
    await db.workOrderTimeLog.create({
      data: {
        workOrderId: id,
        userId: session.userId,
        action: 'start',
        notes: notes || 'Work started',
        timestamp: now,
      },
    });

    // Notify supervisors/approvers
    const notifyTargets = [wo.assignedSupervisorId, wo.teamLeaderId].filter(
      (uid): uid is string => !!uid && uid !== session.userId,
    );
    for (const targetId of notifyTargets) {
      await notifyUser(
        targetId,
        'wo_started',
        'Work Order Started',
        `${wo.woNumber} has been started`,
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
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

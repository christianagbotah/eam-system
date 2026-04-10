import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';

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

    if (wo.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: `Cannot close work order with status "${wo.status}". Must be completed first.` },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await db.workOrder.update({
      where: { id },
      data: {
        status: 'closed',
        isLocked: true,
        lockedBy: session.userId,
        lockedAt: now,
        lockReason: 'Work order closed',
      },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        locker: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

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

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_order',
        entityId: id,
        oldValues: JSON.stringify({ status: wo.status, isLocked: wo.isLocked }),
        newValues: JSON.stringify({ status: 'closed', isLocked: true }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to close work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

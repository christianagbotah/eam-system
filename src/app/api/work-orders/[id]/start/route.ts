import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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

    if (wo.status !== 'assigned') {
      return NextResponse.json(
        { success: false, error: `Cannot start work order with status "${wo.status}"` },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await db.workOrder.update({
      where: { id },
      data: {
        status: 'in_progress',
        actualStart: now,
      },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

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

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_order',
        entityId: id,
        oldValues: JSON.stringify({ status: wo.status }),
        newValues: JSON.stringify({ status: 'in_progress', actualStart: now.toISOString() }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

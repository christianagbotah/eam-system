import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';
import { executeTransition } from '@/lib/state-machine';

/**
 * POST /api/work-orders/[id]/plan
 *
 * Plans a work order (approved → planned).
 * Planner assigns resources, scheduling, and materials.
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

    if (!hasAnyPermission(session, ['work_orders.plan', 'work_orders.update', 'work_orders.*'])) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to plan work order' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      notes,
      estimatedHours,
      plannedStart,
      plannedEnd,
      departmentId,
      assignedSupervisorId,
    } = body;

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const result = await executeTransition(
      'work_order',
      id,
      'planned',
      session,
      {
        notes,
        extraData: {
          plannerId: session.userId,
          estimatedHours: estimatedHours ?? wo.estimatedHours,
          plannedStart: plannedStart ? new Date(plannedStart) : wo.plannedStart,
          plannedEnd: plannedEnd ? new Date(plannedEnd) : wo.plannedEnd,
          departmentId: departmentId ?? wo.departmentId,
          assignedSupervisorId: assignedSupervisorId ?? wo.assignedSupervisorId,
        },
      },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Re-fetch with includes
    const updated = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        planner: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to plan work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

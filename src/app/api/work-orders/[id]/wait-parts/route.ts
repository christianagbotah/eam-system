import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { executeTransition } from '@/lib/state-machine';

/**
 * POST /api/work-orders/[id]/wait-parts
 *
 * Marks a work order as waiting for parts (in_progress → waiting_parts).
 * Used when required parts/materials are not in stock.
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

    if (!hasPermission(session, 'work_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notes, requiredParts } = body;

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const reason = notes || 'Waiting for parts/materials';
    const result = await executeTransition(
      'work_order',
      id,
      'waiting_parts',
      session,
      {
        reason,
        extraData: {
          notes: `[Waiting Parts] ${reason}${requiredParts ? ` | Parts: ${JSON.stringify(requiredParts)}` : ''}`,
        },
      },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Create time log entry
    await db.workOrderTimeLog.create({
      data: {
        workOrderId: id,
        userId: session.userId,
        action: 'pause',
        notes: reason,
        timestamp: new Date(),
      },
    });

    // Re-fetch with includes
    const updated = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update work order status';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

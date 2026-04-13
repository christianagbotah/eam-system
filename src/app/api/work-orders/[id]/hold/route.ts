import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { executeTransition } from '@/lib/state-machine';

/**
 * POST /api/work-orders/[id]/hold
 *
 * Places a work order on hold (in_progress → on_hold).
 * Requires a reason (configured in the transition rule).
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

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'A reason is required to place a work order on hold' },
        { status: 400 }
      );
    }

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const result = await executeTransition(
      'work_order',
      id,
      'on_hold',
      session,
      { reason, extraData: { notes: reason ? `${wo.notes ? wo.notes + '\n' : ''}[On Hold] ${reason}` : wo.notes } },
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
        notes: reason || 'Work put on hold',
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
    const message = error instanceof Error ? error.message : 'Failed to put work order on hold';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

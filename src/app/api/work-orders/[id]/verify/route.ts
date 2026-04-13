import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { executeTransition } from '@/lib/state-machine';

/**
 * POST /api/work-orders/[id]/verify
 *
 * Verifies a completed work order (completed → verified).
 * Typically done by a supervisor to confirm work quality.
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
    const { notes, qualityRating, verifiedBy } = body;

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const result = await executeTransition(
      'work_order',
      id,
      'verified',
      session,
      { notes },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Add verification comment
    const commentContent = notes
      ? `[Verification] ${notes}${qualityRating ? ` | Quality Rating: ${qualityRating}/5` : ''}`
      : `[Verification] Verified by ${session.userId}`;
    await db.workOrderComment.create({
      data: {
        workOrderId: id,
        userId: session.userId,
        content: commentContent,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_order',
        entityId: id,
        newValues: JSON.stringify({
          status: 'verified',
          verifiedBy: session.userId,
          qualityRating: qualityRating ?? null,
        }),
      },
    });

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
    const message = error instanceof Error ? error.message : 'Failed to verify work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

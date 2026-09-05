import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { getPlantScope, canAccessPlantStrict } from '@/lib/plant-scope';

// POST /api/shift-handovers/[id]/confirm
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
    const { overrideReason } = body;

    const handover = await db.shiftHandover.findUnique({
      where: { id },
      include: {
        workOrder: { select: { id: true, plantId: true, status: true } },
        handedOverBy: { select: { id: true } },
        receivedBy: { select: { id: true } },
      },
    });

    if (!handover) {
      return NextResponse.json({ success: false, error: 'Shift handover not found' }, { status: 404 });
    }

    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlantStrict(plantScope, handover.workOrder?.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (handover.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot confirm: current status is '${handover.status}'. Expected 'pending'.` },
        { status: 400 },
      );
    }

    if (handover.workOrder && handover.workOrder.status !== 'pending_handover') {
      return NextResponse.json(
        { success: false, error: `Cannot confirm: linked work order status is '${handover.workOrder.status}'. Expected 'pending_handover'.` },
        { status: 400 },
      );
    }

    const isDesignatedReceiver = handover.receivedById === session.userId;
    const isOverrideRole =
      isAdmin(session) ||
      hasRole(session, 'maintenance_supervisor') ||
      hasRole(session, 'maintenance_manager');

    if (!isDesignatedReceiver && !isOverrideRole) {
      return NextResponse.json({ success: false, error: 'Only the designated receiver or maintenance supervisor/manager can confirm' }, { status: 403 });
    }

    if (!isDesignatedReceiver && isOverrideRole && !overrideReason?.trim()) {
      return NextResponse.json({ success: false, error: 'Override confirmation requires a reason' }, { status: 400 });
    }

    const now = new Date();
    // Keep the persisted model schema-compatible. Confirmation timestamp and
    // override details are immutable audit metadata rather than ad-hoc columns.
    const updated = await db.shiftHandover.update({
      where: { id },
      data: { status: 'confirmed' },
      include: {
        handedOverBy: { select: { id: true, fullName: true, username: true } },
        receivedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: isDesignatedReceiver ? 'shift_handover_confirm' : 'shift_handover_confirm_override',
        entityType: 'shift_handover',
        entityId: id,
        newValues: JSON.stringify({
          status: 'confirmed',
          confirmedAt: now.toISOString(),
          receivedById: handover.receivedById,
          ...(overrideReason ? { overrideReason } : {}),
          ...(!isDesignatedReceiver ? { overriddenBy: session.userId } : {}),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        confirmedAt: now.toISOString(),
        ...(!isDesignatedReceiver ? { overriddenBy: session.userId, overrideReason } : {}),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to confirm shift handover';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

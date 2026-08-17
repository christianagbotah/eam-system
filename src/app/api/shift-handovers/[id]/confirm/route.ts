import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { getPlantScope, canAccessPlant } from '@/lib/plant-scope';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const handover = await db.shiftHandover.findUnique({
      where: { id },
      include: {
        workOrder: {
          select: {
            plantId: true,
            status: true,
            assignedTo: true,
            teamMembers: { select: { userId: true } },
          },
        },
      },
    });

    if (!handover) {
      return NextResponse.json({ success: false, error: 'Shift handover not found' }, { status: 404 });
    }

    // Plant scope validation
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, handover.workOrder?.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Authorization: only the designated recipient or supervisor override can confirm
    const isRecipient = session.userId === handover.receivedById;
    const isSupervisorOverride =
      isAdmin(session) ||
      hasRole(session, 'maintenance_supervisor') ||
      hasRole(session, 'plant_manager');

    if (!isRecipient && !isSupervisorOverride) {
      return NextResponse.json(
        { success: false, error: 'Only the designated incoming recipient or a supervisor can confirm a handover' },
        { status: 403 },
      );
    }

    // Update handover status to confirmed
    const now = new Date();
    const updated = await db.shiftHandover.update({
      where: { id },
      data: {
        status: 'confirmed',
        confirmedAt: now,
        confirmedById: session.userId,
      },
      include: {
        handedOverBy: { select: { id: true, fullName: true, username: true } },
        receivedBy: { select: { id: true, fullName: true, username: true } },
        confirmedBy: { select: { id: true, fullName: true, username: true } },
        workOrder: { select: { id: true, woNumber: true, plantId: true, status: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'shift_handover',
        entityId: id,
        oldValues: JSON.stringify({ status: handover.status }),
        newValues: JSON.stringify({ status: 'confirmed', confirmedById: session.userId }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to confirm shift handover';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { getPlantScope, canAccessPlant } from '@/lib/plant-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        handedOverBy: { select: { id: true, fullName: true, username: true } },
        receivedBy: { select: { id: true, fullName: true, username: true } },
        workOrder: { select: { id: true, plantId: true } },
      },
    });

    if (!handover) {
      return NextResponse.json({ success: false, error: 'Shift handover not found' }, { status: 404 });
    }

    // Plant scope validation (through linked work order)
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, handover.workOrder?.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: handover });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load shift handover';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'shift_handovers.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Block direct confirmation via PUT — must use the dedicated confirm endpoint
    if (body.status === 'confirmed') {
      return NextResponse.json(
        { success: false, error: 'Use POST /api/shift-handovers/[id]/confirm to confirm a handover' },
        { status: 403 },
      );
    }

    const existing = await db.shiftHandover.findUnique({
      where: { id },
      include: { workOrder: { select: { plantId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Shift handover not found' }, { status: 404 });
    }

    // Phase 3G: Plant scope for update
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, existing.workOrder?.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['shiftType', 'shiftDate', 'fromShift', 'toShift', 'receivedById', 'tasksSummary', 'pendingIssues', 'safetyNotes', 'equipmentStatus', 'notes', 'status'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'shiftDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (field === 'tasksSummary' || field === 'pendingIssues' || field === 'equipmentStatus') {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.shiftHandover.update({
      where: { id },
      data: updateData,
      include: {
        handedOverBy: { select: { id: true, fullName: true, username: true } },
        receivedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'shift_handover',
        entityId: id,
        oldValues: JSON.stringify({ shiftType: existing.shiftType, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update shift handover';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.shiftHandover.findUnique({
      where: { id },
      include: { workOrder: { select: { plantId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Shift handover not found' }, { status: 404 });
    }

    // Phase 3G: Plant scope for delete
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, existing.workOrder?.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    await db.shiftHandover.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'shift_handover',
        entityId: id,
        oldValues: JSON.stringify({ shiftType: existing.shiftType }),
      },
    });

    return NextResponse.json({ success: true, message: 'Shift handover deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete shift handover';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

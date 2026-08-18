import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin, hasRole } from '@/lib/auth';
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

    const isConfirming = body.status === 'confirmed' || body.action === 'confirm';
    const isSupervisorOrAdmin = isAdmin(session) || hasRole(session, 'supervisor');
    const isOverride = isConfirming && existing.receivedById && session.userId !== existing.receivedById;

    // ── Confirmation permission gate ───────────────────────────────────
    if (isConfirming) {
      if (isOverride) {
        // Supervisor/admin override: requires explicit reason
        if (!isSupervisorOrAdmin) {
          return NextResponse.json(
            { success: false, error: 'Only the designated receiver can confirm this handover' },
            { status: 403 },
          );
        }
        if (!body.overrideReason || typeof body.overrideReason !== 'string' || body.overrideReason.trim().length === 0) {
          return NextResponse.json(
            { success: false, error: 'Supervisor override requires an overrideReason' },
            { status: 400 },
          );
        }
      }
      // If not an override and there IS a designated receiver, enforce it
      if (!isOverride && existing.receivedById && session.userId !== existing.receivedById) {
        return NextResponse.json(
          { success: false, error: 'Only the designated receiver can confirm this handover' },
          { status: 403 },
        );
      }
    }

    // ── Immutability: confirmed handovers cannot be edited ─────────────
    if (existing.status === 'confirmed' && !isSupervisorOrAdmin) {
      return NextResponse.json(
        { success: false, error: 'This handover is confirmed and cannot be modified' },
        { status: 403 },
      );
    }

    // ── Build update data (excluding status from generic field set) ────
    const updateData: Record<string, unknown> = {};
    const editableFields = ['shiftType', 'shiftDate', 'fromShift', 'toShift', 'receivedById', 'tasksSummary', 'pendingIssues', 'safetyNotes', 'equipmentStatus', 'notes'];

    for (const field of editableFields) {
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

    // ── Handle confirmation separately with full audit ────────────────
    if (isConfirming) {
      updateData.status = 'confirmed';
      // Ensure the receiver is set (use existing if present, else set to current user)
      updateData.receivedById = existing.receivedById || session.userId;
    }

    const updated = await db.shiftHandover.update({
      where: { id },
      data: updateData,
      include: {
        handedOverBy: { select: { id: true, fullName: true, username: true } },
        receivedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // ── Audit trail ───────────────────────────────────────────────────
    if (isOverride) {
      // Special audit entry for supervisor override
      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'update',
          entityType: 'shift_handover',
          entityId: id,
          oldValues: JSON.stringify({ status: existing.status, receivedById: existing.receivedById }),
          newValues: JSON.stringify({ status: 'confirmed', override: true, overrideReason: body.overrideReason, overrideBy: session.userId }),
        },
      });
    } else {
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
    }

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

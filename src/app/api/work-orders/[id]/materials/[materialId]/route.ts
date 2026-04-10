import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';

const VALID_STATUSES = ['requested', 'approved', 'issued', 'returned'];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id, materialId } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate WO exists
    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Validate material belongs to the WO
    const existing = await db.workOrderMaterial.findUnique({
      where: { id: materialId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });
    }

    if (existing.workOrderId !== id) {
      return NextResponse.json(
        { success: false, error: 'Material does not belong to this work order' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = { status };

    if (status === 'approved') {
      updateData.approvedBy = session.userId;
    }

    if (status === 'issued') {
      updateData.issuedBy = session.userId;
    }

    const updated = await db.workOrderMaterial.update({
      where: { id: materialId },
      data: updateData,
      include: {
        requester: { select: { id: true, fullName: true, username: true } },
        approver: { select: { id: true, fullName: true } },
        issuer: { select: { id: true, fullName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'wo_material',
        entityId: materialId,
        oldValues: JSON.stringify({ status: existing.status }),
        newValues: JSON.stringify({
          status,
          notes: notes || undefined,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update material';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['work_orders.update', 'work_orders.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id, materialId } = await params;

    // Validate WO exists
    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked && !session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Work order is locked' }, { status: 400 });
    }

    // Validate material belongs to the WO
    const material = await db.workOrderMaterial.findUnique({
      where: { id: materialId },
      include: { requester: { select: { id: true, fullName: true } } },
    });
    if (!material) {
      return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });
    }

    if (material.workOrderId !== id) {
      return NextResponse.json(
        { success: false, error: 'Material does not belong to this work order' },
        { status: 400 }
      );
    }

    // Only allow deletion if status is "requested"
    if (material.status !== 'requested') {
      return NextResponse.json(
        { success: false, error: `Cannot delete material with status "${material.status}". Only materials with "requested" status can be deleted.` },
        { status: 400 }
      );
    }

    await db.workOrderMaterial.delete({
      where: { id: materialId },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'wo_material',
        entityId: materialId,
        oldValues: JSON.stringify({
          workOrderId: id,
          itemName: material.itemName,
          quantity: material.quantity,
          status: material.status,
        }),
      },
    });

    return NextResponse.json({ success: true, data: { id: materialId } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete material';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const existing = await db.inventoryAdjustment.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!existing) return NextResponse.json({ success: false, error: 'Adjustment not found' }, { status: 404 });
    if (existing.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Only pending adjustments can be updated' }, { status: 400 });
    }

    if (body.action === 'approve') {
      // Apply stock adjustment
      const newStock = body.type === 'gain'
        ? existing.item.currentStock + existing.quantity
        : existing.item.currentStock - existing.quantity;

      await db.$transaction([
        db.inventoryAdjustment.update({
          where: { id },
          data: {
            status: 'approved',
            approvedById: session.userId,
            approvedAt: new Date(),
          },
        }),
        db.inventoryItem.update({
          where: { id: existing.itemId },
          data: { currentStock: Math.max(0, newStock) },
        }),
        db.stockMovement.create({
          data: {
            itemId: existing.itemId,
            type: 'adjustment',
            quantity: existing.quantity,
            previousStock: existing.item.currentStock,
            newStock: Math.max(0, newStock),
            reason: existing.reason,
            referenceType: 'adjustment',
            referenceId: id,
            performedById: session.userId,
            notes: body.notes || null,
          },
        }),
      ]);

      const updated = await db.inventoryAdjustment.findUnique({
        where: { id },
        include: {
          item: { select: { id: true, name: true, itemCode: true } },
          createdBy: { select: { id: true, fullName: true } },
          approvedBy: { select: { id: true, fullName: true } },
        },
      });

      await db.auditLog.create({
        data: { userId: session.userId, action: 'update', entityType: 'inventory_adjustment', entityId: id, oldValues: JSON.stringify({ status: 'pending' }), newValues: JSON.stringify({ status: 'approved' }) },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (body.action === 'reject') {
      const updated = await db.inventoryAdjustment.update({
        where: { id },
        data: {
          status: 'rejected',
          approvedById: session.userId,
          approvedAt: new Date(),
          notes: body.notes ? (existing.notes ? `${existing.notes}\n[Rejected]: ${body.notes}` : `[Rejected]: ${body.notes}`) : existing.notes,
        },
        include: {
          item: { select: { id: true, name: true, itemCode: true } },
          createdBy: { select: { id: true, fullName: true } },
          approvedBy: { select: { id: true, fullName: true } },
        },
      });

      await db.auditLog.create({
        data: { userId: session.userId, action: 'update', entityType: 'inventory_adjustment', entityId: id, oldValues: JSON.stringify({ status: 'pending' }), newValues: JSON.stringify({ status: 'rejected' }) },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use "approve" or "reject".' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update adjustment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

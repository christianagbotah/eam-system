import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['work_orders.update', 'work_orders.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { itemName, itemId, quantity, unitCost, totalCost: providedTotalCost } = body;

    if (!itemName) {
      return NextResponse.json(
        { success: false, error: 'itemName is required' },
        { status: 400 }
      );
    }

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked && !session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Work order is locked' }, { status: 400 });
    }

    // Auto-calculate totalCost if unitCost and quantity are provided
    const calculatedTotal =
      providedTotalCost !== undefined
        ? providedTotalCost
        : unitCost !== undefined && quantity !== undefined
          ? unitCost * quantity
          : undefined;

    const material = await db.workOrderMaterial.create({
      data: {
        workOrderId: id,
        itemName,
        itemId: itemId || null,
        quantity: quantity ?? null,
        unitCost: unitCost ?? null,
        totalCost: calculatedTotal ?? null,
        status: 'requested',
        requestedBy: session.userId,
      },
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
        action: 'create',
        entityType: 'wo_material',
        entityId: material.id,
        newValues: JSON.stringify({
          workOrderId: id,
          itemName,
          itemId,
          quantity,
          unitCost,
          totalCost: calculatedTotal,
        }),
      },
    });

    return NextResponse.json({ success: true, data: material }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add material';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

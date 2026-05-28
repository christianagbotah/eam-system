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

    const { id } = await params;

    if (!hasAnyPermission(session, ['work_orders.update', 'work_orders.*'])) {
      // Even without explicit permission, allow if the user is a team member or assignee
      const woCheck = await db.workOrder.findUnique({
        where: { id },
        select: { id: true, assignedTo: true, teamMembers: { select: { userId: true } } },
      });
      if (!woCheck || (woCheck.assignedTo !== session.userId && !woCheck.teamMembers.some(m => m.userId === session.userId))) {
        return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { itemName, itemId, quantity, unitCost, totalCost: providedTotalCost } = body;

    // If itemId provided but no itemName, resolve from inventory
    let resolvedItemName = itemName;
    if (!resolvedItemName && itemId) {
      const invItem = await db.inventoryItem.findUnique({
        where: { id: itemId },
        select: { itemName: true, name: true },
      });
      if (invItem) {
        resolvedItemName = invItem.itemName || invItem.name || itemId;
      } else {
        resolvedItemName = itemId;
      }
    }

    if (!resolvedItemName) {
      return NextResponse.json(
        { success: false, error: 'itemName is required' },
        { status: 400 }
      );
    }

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is permanently locked. No modifications are allowed after planner closure.' }, { status: 400 });
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
        itemName: resolvedItemName,
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
          itemName: resolvedItemName,
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

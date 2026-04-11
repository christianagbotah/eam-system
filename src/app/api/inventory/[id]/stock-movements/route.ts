import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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

    // Verify inventory item exists
    const item = await db.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    const movements = await db.stockMovement.findMany({
      where: { itemId: id },
      include: {
        performedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: movements });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load stock movements';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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
    const {
      type,
      quantity,
      reason,
      referenceType,
      referenceId,
      notes,
    } = body;

    if (!type || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Type and quantity are required' },
        { status: 400 }
      );
    }

    const validTypes = ['in', 'out', 'adjustment', 'transfer'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be positive' },
        { status: 400 }
      );
    }

    // Get current item and lock it
    const item = await db.inventoryItem.findUnique({
      where: { id },
    });
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    if (!item.isActive) {
      return NextResponse.json(
        { success: false, error: 'Cannot move stock for inactive item' },
        { status: 400 }
      );
    }

    const previousStock = item.currentStock;
    let newStock: number;

    if (type === 'in') {
      newStock = previousStock + quantity;
    } else if (type === 'out') {
      newStock = previousStock - quantity;
    } else if (type === 'adjustment') {
      newStock = quantity; // For adjustment, quantity IS the new stock level
    } else {
      // transfer = out from current
      newStock = previousStock - quantity;
    }

    // Validate stock doesn't go negative
    if (newStock < 0) {
      return NextResponse.json(
        { success: false, error: `Insufficient stock. Current: ${previousStock}, Attempted to remove: ${quantity}` },
        { status: 400 }
      );
    }

    // Use a transaction to update stock and create movement atomically
    const result = await db.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          itemId: id,
          type,
          quantity,
          previousStock,
          newStock,
          reason: reason || null,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          performedById: session.userId,
          notes: notes || null,
        },
        include: {
          performedBy: { select: { id: true, fullName: true, username: true } },
        },
      });

      await tx.inventoryItem.update({
        where: { id },
        data: { currentStock: newStock },
      });

      return movement;
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'stock_movement',
        entityId: result.id,
        newValues: JSON.stringify({
          itemId: id,
          type,
          quantity,
          previousStock,
          newStock,
        }),
      },
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create stock movement';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

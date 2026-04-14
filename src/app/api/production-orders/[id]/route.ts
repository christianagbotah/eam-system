import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { getPlantScope } from '@/lib/plant-scope';

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

    const order = await db.productionOrder.findUnique({
      where: { id },
      include: {
        workCenter: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Production order not found' },
        { status: 404 }
      );
    }

    // IDOR protection: ensure user has access to this order's plant
    if (order.plantId) {
      const plantScope = await getPlantScope(request, session);
      if (plantScope.isScoped && plantScope.plantId && order.plantId !== plantScope.plantId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load production order';
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
    if (!hasPermission(session, 'production_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.productionOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Production order not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'status', 'priority',
      'productName', 'quantity', 'completedQty', 'unitCost',
      'workCenterId', 'scheduledStart', 'scheduledEnd',
      'actualStart', 'actualEnd', 'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (['scheduledStart', 'scheduledEnd', 'actualStart', 'actualEnd'].includes(field)) {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (['quantity', 'completedQty', 'unitCost'].includes(field)) {
          updateData[field] = body[field] !== null ? parseFloat(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.productionOrder.update({
      where: { id },
      data: updateData,
      include: {
        workCenter: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'production_order',
        entityId: id,
        oldValues: JSON.stringify({ orderNumber: existing.orderNumber, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update production order';
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

    const existing = await db.productionOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Production order not found' },
        { status: 404 }
      );
    }

    // Cancel instead of hard delete
    const cancelled = await db.productionOrder.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        workCenter: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'production_order',
        entityId: id,
        oldValues: JSON.stringify({ orderNumber: existing.orderNumber, status: existing.status }),
        newValues: JSON.stringify({ status: 'cancelled' }),
      },
    });

    return NextResponse.json({ success: true, data: cancelled });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel production order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

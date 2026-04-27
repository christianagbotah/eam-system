import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

async function enrichBatch(batch: any) {
  const [order, createdBy] = await Promise.all([
    batch.orderId
      ? db.productionOrder.findUnique({ where: { id: batch.orderId }, select: { id: true, orderNumber: true, title: true } })
      : Promise.resolve(null),
    db.user.findUnique({ where: { id: batch.createdById }, select: { id: true, fullName: true, username: true } }),
  ]);
  return { ...batch, order, createdBy };
}

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

    const batch = await db.productionBatch.findUnique({ where: { id } });
    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Production batch not found' },
        { status: 404 }
      );
    }

    const enriched = await enrichBatch(batch);
    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load production batch';
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
    if (!hasPermission(session, 'production_batches.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.productionBatch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Production batch not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'productName', 'orderId', 'quantity', 'completedQty',
      'status', 'startDate', 'endDate', 'yield_', 'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (['startDate', 'endDate'].includes(field)) {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (['quantity', 'completedQty', 'yield_'].includes(field)) {
          updateData[field] = body[field] !== null ? parseFloat(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.productionBatch.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'production_batch',
        entityId: id,
        oldValues: JSON.stringify({ batchNumber: existing.batchNumber, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    const enriched = await enrichBatch(updated);
    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update production batch';
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

    const existing = await db.productionBatch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Production batch not found' },
        { status: 404 }
      );
    }

    // Mark as rejected instead of hard delete
    const rejected = await db.productionBatch.update({
      where: { id },
      data: { status: 'rejected' },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'production_batch',
        entityId: id,
        oldValues: JSON.stringify({ batchNumber: existing.batchNumber, status: existing.status }),
        newValues: JSON.stringify({ status: 'rejected' }),
      },
    });

    const enriched = await enrichBatch(rejected);
    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete production batch';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

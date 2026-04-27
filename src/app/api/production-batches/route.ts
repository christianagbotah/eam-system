import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

// Helper: generate batch number BATCH-YYYYMM-NNNN
async function generateBatchNumber(): Promise<string> {
  const now = new Date();
  const prefix = `BATCH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.productionBatch.findFirst({
    where: { batchNumber: { startsWith: prefix } },
    orderBy: { batchNumber: 'desc' },
    select: { batchNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.batchNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

async function enrichBatches(batches: any[]) {
  const orderIds = new Set<string>();
  const userIds = new Set<string>();
  for (const b of batches) {
    if (b.orderId) orderIds.add(b.orderId);
    if (b.createdById) userIds.add(b.createdById);
  }

  const [orders, users] = await Promise.all([
    orderIds.size > 0
      ? db.productionOrder.findMany({ where: { id: { in: [...orderIds] } }, select: { id: true, orderNumber: true, title: true } })
      : [],
    userIds.size > 0
      ? db.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, fullName: true, username: true } })
      : [],
  ]);

  const orderMap = new Map(orders.map(o => [o.id, o] as [string, typeof o]));
  const userMap = new Map(users.map(u => [u.id, u] as [string, typeof u]));

  return batches.map(b => ({
    ...b,
    order: b.orderId ? orderMap.get(b.orderId) || null : null,
    createdBy: b.createdById ? userMap.get(b.createdById) || null : null,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { batchNumber: { contains: search } },
        { productName: { contains: search } },
      ];
    }

    const [batches, total] = await Promise.all([
      db.productionBatch.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.productionBatch.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, plannedCount, inProgressCount, completedCount, onHoldCount] = await Promise.all([
      db.productionBatch.count(),
      db.productionBatch.count({ where: { status: 'planned' } }),
      db.productionBatch.count({ where: { status: 'in_progress' } }),
      db.productionBatch.count({ where: { status: 'completed' } }),
      db.productionBatch.count({ where: { status: 'quality_check' } }),
    ]);

    const enriched = await enrichBatches(batches);

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        planned: plannedCount,
        inProgress: inProgressCount,
        completed: completedCount,
        onHold: onHoldCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load production batches';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'production_batches.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      productName,
      orderId,
      quantity,
      status,
      startDate,
      yieldPct,
      notes,
    } = body;

    if (!productName) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }

    if (!quantity && quantity !== 0) {
      return NextResponse.json({ success: false, error: 'Quantity is required' }, { status: 400 });
    }

    const batchNumber = await generateBatchNumber();

    const batch = await db.productionBatch.create({
      data: {
        batchNumber,
        productName,
        orderId: orderId || null,
        quantity: parseFloat(quantity) || 0,
        status: status || 'planned',
        startDate: startDate ? new Date(startDate) : null,
        yield_: yieldPct ? parseFloat(yieldPct) : null,
        notes: notes || null,
        createdById: session.userId,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'production_batch',
        entityId: batch.id,
        newValues: JSON.stringify({ batchNumber, productName, quantity }),
      },
    });

    const enriched = await enrichBatches([batch]);
    return NextResponse.json({ success: true, data: enriched[0] }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create production batch';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

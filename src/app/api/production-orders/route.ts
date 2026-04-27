import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { getPlantScope, getPlantFilterWhere } from '@/lib/plant-scope';

// Helper: generate production order number PO-PROD-YYYYMM-NNNN
async function generatePONumber(): Promise<string> {
  const now = new Date();
  const prefix = `PO-PROD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.productionOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.orderNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const plantScope = await getPlantScope(request, session);
    const plantFilter = getPlantFilterWhere(plantScope);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { title: { contains: search } },
        { productName: { contains: search } },
        { description: { contains: search } },
      ];
    }

    Object.assign(where, plantFilter);

    const [orders, total] = await Promise.all([
      db.productionOrder.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          workCenter: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.productionOrder.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, plannedCount, inProgressCount, completedCount, cancelledCount] = await Promise.all([
      db.productionOrder.count({ where: { ...plantFilter } }),
      db.productionOrder.count({ where: { status: 'planned', ...plantFilter } }),
      db.productionOrder.count({ where: { status: 'in_progress', ...plantFilter } }),
      db.productionOrder.count({ where: { status: 'completed', ...plantFilter } }),
      db.productionOrder.count({ where: { status: 'cancelled', ...plantFilter } }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
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
        cancelled: cancelledCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load production orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'production_orders.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const plantScope = await getPlantScope(request, session);

    const body = await request.json();
    const {
      title,
      description,
      status,
      priority,
      productName,
      quantity,
      unitCost,
      workCenterId,
      scheduledStart,
      scheduledEnd,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Order title is required' }, { status: 400 });
    }

    if (!quantity && quantity !== 0) {
      return NextResponse.json({ success: false, error: 'Quantity is required' }, { status: 400 });
    }

    const orderNumber = await generatePONumber();

    const order = await db.productionOrder.create({
      data: {
        orderNumber,
        title,
        description: description || null,
        status: status || 'planned',
        priority: priority || 'medium',
        productName: productName || null,
        quantity: parseFloat(quantity) || 0,
        unitCost: unitCost ? parseFloat(unitCost) : null,
        workCenterId: workCenterId || null,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        notes: notes || null,
        createdById: session.userId,
        plantId: body.plantId || plantScope?.plantId || null,
      },
      include: {
        workCenter: { select: { id: true, code: true, name: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'production_order',
        entityId: order.id,
        newValues: JSON.stringify({ orderNumber, title, status, priority }),
      },
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create production order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

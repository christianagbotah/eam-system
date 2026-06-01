import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';

// Helper: generate auto-number SPR-YYYYMM-NNNN
async function generateReturnNumber(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `SPR-${ym}-`;

  const lastRecord = await db.sparePartReturn.findFirst({
    where: { returnNumber: { startsWith: prefix } },
    orderBy: { returnNumber: 'desc' },
    select: { returnNumber: true },
  });

  let seq = 1;
  if (lastRecord) {
    const numPart = lastRecord.returnNumber.slice(prefix.length);
    seq = (parseInt(numPart, 10) || 0) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// GET /api/repairs/spare-part-returns
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const workOrderId = searchParams.get('workOrderId') || undefined;
    const plantId = searchParams.get('plantId') || undefined;
    const itemId = searchParams.get('itemId') || undefined;
    const stats = searchParams.get('stats') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || undefined;

    // Stats mode
    if (stats) {
      const [total, byStatus] = await Promise.all([
        db.sparePartReturn.count({ where: { plantId: plantId || undefined } }),
        db.sparePartReturn.groupBy({
          by: ['status'],
          where: { plantId: plantId || undefined },
          _count: { id: true },
        }),
      ]);

      const statusCounts: Record<string, number> = {};
      for (const group of byStatus) {
        statusCounts[group.status] = group._count.id;
      }

      const pendingInspection = await db.sparePartReturn.count({
        where: { status: 'pending', plantId: plantId || undefined },
      });

      const pendingRefurbishment = await db.sparePartReturn.count({
        where: { status: 'inspected', refurbishmentNeeded: true, plantId: plantId || undefined },
      });

      const pendingStoreReturn = await db.sparePartReturn.count({
        where: { status: 'refurbished', plantId: plantId || undefined },
      });

      return NextResponse.json({
        success: true,
        data: {
          total,
          byStatus: statusCounts,
          pendingInspection,
          pendingRefurbishment,
          pendingStoreReturn,
        },
      });
    }

    // List mode with filters
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (workOrderId) where.workOrderId = workOrderId;
    if (plantId) where.plantId = plantId;
    if (itemId) where.itemId = itemId;
    if (search) {
      where.OR = [
        { returnNumber: { contains: search } },
        { itemName: { contains: search } },
        { partSerialNumber: { contains: search } },
      ];
    }

    const [returns, total] = await Promise.all([
      db.sparePartReturn.findMany({
        where,
        include: {
          workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
          item: { select: { id: true, itemCode: true, name: true, currentStock: true, unitOfMeasure: true } },
          requestedBy: { select: { id: true, fullName: true, username: true, avatar: true } },
          inspectedBy: { select: { id: true, fullName: true } },
          refurbisher: { select: { id: true, fullName: true } },
          returnedToStore: { select: { id: true, fullName: true } },
          disposedByUser: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Math.min(limit, 100),
      }),
      db.sparePartReturn.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: returns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch spare part returns';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/spare-part-returns
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const canCreate = isAdmin(session) || hasRole(session, 'maintenance_technician') || hasRole(session, 'maintenance_supervisor') || hasRole(session, 'store_keeper') || hasRole(session, 'tools_shop_attendant') || hasRole(session, 'inventory_manager');
    if (!canCreate) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to create spare part returns' }, { status: 403 });
    }

    const body = await request.json();
    const {
      workOrderId,
      materialRequestId,
      itemId,
      itemName,
      partSerialNumber,
      quantity,
      conditionOnReturn,
      damageDescription,
      plantId,
    } = body;

    if (!workOrderId || !itemName) {
      return NextResponse.json(
        { success: false, error: 'workOrderId and itemName are required' },
        { status: 400 },
      );
    }

    // Verify work order exists
    const wo = await db.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, woNumber: true, title: true },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Resolve plantId from WO if not provided
    const resolvedPlantId = plantId || (await db.workOrder.findUnique({ where: { id: workOrderId }, select: { plantId: true } }))?.plantId || null;

    // Verify item exists if itemId provided
    if (itemId) {
      const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) {
        return NextResponse.json({ success: false, error: 'Inventory item not found' }, { status: 404 });
      }
    }

    const returnNumber = await generateReturnNumber();

    const sparePartReturn = await db.sparePartReturn.create({
      data: {
        returnNumber,
        workOrderId,
        materialRequestId: materialRequestId || null,
        itemId: itemId || null,
        itemName,
        partSerialNumber: partSerialNumber || null,
        quantity: quantity ?? 1,
        conditionOnReturn: conditionOnReturn || 'used',
        damageDescription: damageDescription || null,
        plantId: resolvedPlantId,
        requestedById: session.userId,
      },
      include: {
        workOrder: { select: { id: true, woNumber: true, title: true } },
        item: { select: { id: true, itemCode: true, name: true } },
        requestedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Audit log
    await createAuditLog(session.userId, 'SparePartReturn', 'create', sparePartReturn.id, {
      newValues: {
        returnNumber,
        workOrderId,
        itemName,
        quantity,
        conditionOnReturn,
      },
    });

    // Notify relevant users (planner, storekeeper)
    if (wo) {
      notifyUser(session.userId, 'spare_part_returned', 'Spare Part Return Created', `${returnNumber} for WO ${wo.woNumber}: ${itemName}`, 'spare_part_return', sparePartReturn.id, 'spare-part-returns').catch(() => {});
    }

    return NextResponse.json({ success: true, data: sparePartReturn }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create spare part return';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

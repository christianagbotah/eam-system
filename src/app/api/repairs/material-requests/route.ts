import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

// GET /api/repairs/material-requests — list with filters
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    const { searchParams } = new URL(request.url);

    const workOrderId = searchParams.get('workOrderId');
    const status = searchParams.get('status');
    const requestedById = searchParams.get('requestedById');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};
    if (workOrderId) where.workOrderId = workOrderId;
    if (status) where.status = status;
    if (requestedById) where.requestedById = requestedById;

    // Technicians see only their own requests (unless admin/supervisor)
    if (session && !isAdmin(session) && !session.roles.includes('supervisor') && !session.roles.includes('planner') && !session.roles.includes('store_keeper')) {
      where.requestedById = session.userId;
    }

    const [requests, total] = await Promise.all([
      db.repairMaterialRequest.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          requestedBy: { select: { id: true, fullName: true, username: true } },
          supervisorApprovedBy: { select: { id: true, fullName: true } },
          storekeeperApprovedBy: { select: { id: true, fullName: true } },
          issuedByUser: { select: { id: true, fullName: true } },
          returnedByUser: { select: { id: true, fullName: true } },
          workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
          item: { select: { id: true, itemCode: true, name: true, currentStock: true, unitOfMeasure: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.repairMaterialRequest.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({ success: true, data: requests, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load material requests';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/material-requests — create
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { workOrderId, itemId, itemName, quantityRequested, unit, unitCost, reason, notes } = body;

    if (!workOrderId || !itemName || !quantityRequested || !reason) {
      return NextResponse.json({ success: false, error: 'workOrderId, itemName, quantityRequested, and reason are required' }, { status: 400 });
    }

    // Verify WO exists
    const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });

    // Check inventory availability
    let currentStock: number | null = null;
    let resolvedUnitCost = unitCost || null;
    if (itemId) {
      const invItem = await db.inventoryItem.findUnique({ where: { id: itemId } });
      if (invItem) {
        currentStock = invItem.currentStock;
        if (!resolvedUnitCost) resolvedUnitCost = invItem.unitCost;
      }
    }

    const estimatedCost = (quantityRequested || 0) * (resolvedUnitCost || 0);

    const matReq = await db.repairMaterialRequest.create({
      data: {
        workOrderId,
        itemId: itemId || null,
        itemName,
        quantityRequested,
        quantityApproved: 0,
        quantityIssued: 0,
        quantityReturned: 0,
        unit: unit || 'each',
        unitCost: resolvedUnitCost,
        estimatedCost,
        reason,
        notes: notes || null,
        status: 'pending',
        requestedById: session.userId,
      },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        workOrder: { select: { id: true, woNumber: true, title: true } },
        item: { select: { id: true, itemCode: true, name: true, currentStock: true } },
      },
    });

    // Notify supervisor for approval
    if (wo.assignedSupervisorId) {
      await db.notification.create({
        data: {
          userId: wo.assignedSupervisorId,
          type: 'repair_material_request',
          title: 'Material Request Pending Approval',
          message: `${matReq.requestedBy.fullName} requested ${quantityRequested} ${unit || 'each'} of ${itemName} for WO ${wo.woNumber}`,
          entityType: 'repair_material_request',
          entityId: matReq.id,
          actionUrl: 'maintenance-work-orders',
        },
      });
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'repair_material_request',
        entityId: matReq.id,
        newValues: JSON.stringify({ workOrderId, itemName, quantityRequested, reason }),
      },
    });

    return NextResponse.json({ success: true, data: { ...matReq, currentStock } }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create material request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

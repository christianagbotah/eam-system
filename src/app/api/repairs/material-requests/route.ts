import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

// Urgency priority for sorting (higher number = more urgent)
const URGENCY_ORDER: Record<string, number> = { critical: 4, high: 3, normal: 2, low: 1 };

// Valid urgency values
const VALID_URGENCIES = ['low', 'normal', 'high', 'critical'];

// 24-hour threshold for overdue detection
const OVERDUE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// GET /api/repairs/material-requests — list with filters, stats, urgency sorting, overdue detection
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    const { searchParams } = new URL(request.url);

    const workOrderId = searchParams.get('workOrderId');
    const status = searchParams.get('status');
    const requestedById = searchParams.get('requestedById');
    const urgency = searchParams.get('urgency');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const stats = searchParams.get('stats') === 'true';

    const where: Record<string, unknown> = {};
    if (workOrderId) where.workOrderId = workOrderId;
    if (status) where.status = status;
    if (requestedById) where.requestedById = requestedById;
    if (urgency && VALID_URGENCIES.includes(urgency)) where.urgency = urgency;

    // Technicians see only their own requests (unless admin/supervisor)
    if (session && !isAdmin(session) && !session.roles.includes('maintenance_supervisor') && !session.roles.includes('maintenance_planner') && !session.roles.includes('store_keeper')) {
      where.requestedById = session.userId;
    }

    // Stats endpoint — aggregated counts instead of list
    if (stats) {
      const [
        total,
        pending,
        supervisorApproved,
        storekeeperApproved,
        issued,
        returned,
        rejected,
        overdueCount,
        urgencyBreakdown,
      ] = await Promise.all([
        db.repairMaterialRequest.count({ where: Object.keys(where).length > 0 ? where : undefined }),
        db.repairMaterialRequest.count({ where: { ...where, status: 'pending' } }),
        db.repairMaterialRequest.count({ where: { ...where, status: 'supervisor_approved' } }),
        db.repairMaterialRequest.count({ where: { ...where, status: 'storekeeper_approved' } }),
        db.repairMaterialRequest.count({ where: { ...where, status: 'issued' } }),
        db.repairMaterialRequest.count({ where: { ...where, status: { in: ['partially_returned', 'fully_returned'] } } }),
        db.repairMaterialRequest.count({ where: { ...where, status: 'rejected' } }),
        // Overdue: pending requests older than 24 hours
        db.repairMaterialRequest.count({
          where: {
            ...where,
            status: 'pending',
            createdAt: { lt: new Date(Date.now() - OVERDUE_THRESHOLD_MS) },
          },
        }),
        // Urgency breakdown
        db.repairMaterialRequest.groupBy({
          by: ['urgency'],
          where: Object.keys(where).length > 0 ? where : undefined,
          _count: { urgency: true },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          total,
          byStatus: {
            pending,
            supervisorApproved,
            storekeeperApproved,
            issued,
            returned,
            rejected,
          },
          overdueCount,
          urgency: urgencyBreakdown.map((g) => ({
            level: g.urgency,
            count: g._count.urgency,
          })),
        },
      });
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

    // Apply urgency-based sorting in memory (critical → high → normal → low), then createdAt desc
    const now = Date.now();
    const enriched = requests.map((req) => ({
      ...req,
      // Compute overdue flag: pending requests older than 24 hours
      isOverdue:
        req.status === 'pending' &&
        now - new Date(req.createdAt).getTime() > OVERDUE_THRESHOLD_MS,
    }));

    enriched.sort((a, b) => {
      const urgencyDiff = (URGENCY_ORDER[b.urgency] || 0) - (URGENCY_ORDER[a.urgency] || 0);
      if (urgencyDiff !== 0) return urgencyDiff;
      // Within same urgency, sort by createdAt desc (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load material requests';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/material-requests — create with urgency and inventory validation
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { workOrderId, itemId, itemName, quantityRequested, unit, unitCost, reason, notes, urgency } = body;

    if (!workOrderId || !itemName || !quantityRequested || !reason) {
      return NextResponse.json({ success: false, error: 'workOrderId, itemName, quantityRequested, and reason are required' }, { status: 400 });
    }

    // Validate urgency value
    const resolvedUrgency = VALID_URGENCIES.includes(urgency) ? urgency : 'normal';

    // Verify WO exists
    const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });

    // Check inventory availability and validate stock levels
    let currentStock: number | null = null;
    let resolvedUnitCost = unitCost || null;
    let stockWarning: string | null = null;

    if (itemId) {
      const invItem = await db.inventoryItem.findUnique({ where: { id: itemId } });
      if (invItem) {
        currentStock = invItem.currentStock;
        if (!resolvedUnitCost) resolvedUnitCost = invItem.unitCost;

        // Better inventory validation: check if currentStock >= quantityRequested
        if (invItem.currentStock < quantityRequested) {
          stockWarning = `Insufficient stock for ${invItem.name}. Available: ${invItem.currentStock}, Requested: ${quantityRequested}. Shortfall: ${quantityRequested - invItem.currentStock}`;
        } else if (invItem.currentStock < quantityRequested * 2) {
          // Low stock warning when less than 2x the requested quantity remains after issuance
          const remainingAfterIssue = invItem.currentStock - quantityRequested;
          if (remainingAfterIssue < invItem.currentStock * 0.1) {
            stockWarning = `Low stock warning: issuing ${quantityRequested} would leave only ${remainingAfterIssue} units of ${invItem.name} in inventory.`;
          }
        }
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
        urgency: resolvedUrgency,
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
      await notifyUser(wo.assignedSupervisorId, 'repair_material_request', `${resolvedUrgency === 'critical' ? '🔴 ' : resolvedUrgency === 'high' ? '🟠 ' : ''}Material Request Pending Approval`, `${matReq.requestedBy.fullName} requested ${quantityRequested} ${unit || 'each'} of ${itemName} [${resolvedUrgency.toUpperCase()}] for WO ${wo.woNumber}`, 'repair_material_request', matReq.id, 'maintenance-work-orders');
    }

    // Notify planner if assigned on the work order
    if (wo.plannerId && wo.plannerId !== wo.assignedSupervisorId) {
      await notifyUser(wo.plannerId, 'repair_material_request', 'New Material Request Submitted', `${matReq.requestedBy.fullName} requested ${quantityRequested} ${unit || 'each'} of ${itemName} [${resolvedUrgency.toUpperCase()}] for WO ${wo.woNumber}`, 'repair_material_request', matReq.id, 'maintenance-work-orders');
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'repair_material_request',
        entityId: matReq.id,
        newValues: JSON.stringify({ workOrderId, itemName, quantityRequested, urgency: resolvedUrgency, reason }),
      },
    });

    const responseData = { ...matReq, currentStock };
    if (stockWarning) {
      return NextResponse.json({
        success: true,
        data: responseData,
        warning: stockWarning,
      }, { status: 201 });
    }

    return NextResponse.json({ success: true, data: responseData }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create material request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

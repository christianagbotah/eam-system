import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { getPlantScope, canAccessPlant } from '@/lib/plant-scope';
import { notifyUser } from '@/lib/notifications';

// POST /api/repairs/material-requests/reconcile
// Records consumption data for an issued material request
// Computes reconciliation: issuedQty - consumedQty - wastedQty = returnedQty
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'repair_material_requests.update') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, consumedQty, wastedQty, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Material request ID is required' }, { status: 400 });
    }

    if (consumedQty === undefined || consumedQty === null) {
      return NextResponse.json({ success: false, error: 'consumedQty is required' }, { status: 400 });
    }

    if (typeof consumedQty !== 'number' || consumedQty < 0) {
      return NextResponse.json({ success: false, error: 'consumedQty must be a non-negative number' }, { status: 400 });
    }

    if (wastedQty !== undefined && wastedQty !== null && (typeof wastedQty !== 'number' || wastedQty < 0)) {
      return NextResponse.json({ success: false, error: 'wastedQty must be a non-negative number' }, { status: 400 });
    }

    const resolvedWastedQty = wastedQty || 0;

    // Fetch the material request with relations
    const matReq = await db.repairMaterialRequest.findUnique({
      where: { id },
      include: {
        workOrder: {
          select: {
            id: true, woNumber: true, title: true, plantId: true,
            assignedSupervisorId: true, plannerId: true, assignedTo: true,
          },
        },
        requestedBy: { select: { id: true, fullName: true } },
        item: { select: { id: true, itemCode: true, name: true, currentStock: true } },
      },
    });

    if (!matReq) {
      return NextResponse.json({ success: false, error: 'Material request not found' }, { status: 404 });
    }

    // ── Plant scope validation ──
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, matReq.workOrder?.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Validate status — must be issued or picking (allows reconciliation from both)
    if (matReq.status !== 'issued' && matReq.status !== 'picking') {
      return NextResponse.json(
        { success: false, error: `Cannot reconcile: current status is '${matReq.status}'. Expected 'issued' or 'picking'.` },
        { status: 400 },
      );
    }

    const issuedQty = matReq.quantityIssued || matReq.quantityApproved || 0;

    // Validate consumed + wasted doesn't exceed issued
    if (consumedQty + resolvedWastedQty > issuedQty) {
      return NextResponse.json(
        {
          success: false,
          error: `Total consumed (${consumedQty}) + wasted (${resolvedWastedQty}) exceeds issued quantity (${issuedQty})`,
        },
        { status: 400 },
      );
    }

    // Compute reconciliation
    const returnedQty = Math.max(0, issuedQty - consumedQty - resolvedWastedQty);
    const reconciliationRate = issuedQty > 0 ? (consumedQty / issuedQty) * 100 : 0;
    const wasteRate = issuedQty > 0 ? (resolvedWastedQty / issuedQty) * 100 : 0;
    const now = new Date();

    // Update material request + return excess stock in a single transaction
    const { updated, returnedToInventory } = await db.$transaction(async (tx) => {
      const req = await tx.repairMaterialRequest.update({
        where: { id },
        data: {
          consumedQty,
          wastedQty: resolvedWastedQty > 0 ? resolvedWastedQty : null,
          quantityReturned: returnedQty,
          status: (consumedQty + resolvedWastedQty >= issuedQty) ? 'closed' : 'issued',
          notes: matReq.notes
            ? `${matReq.notes}\n[${now.toISOString()}] RECONCILIATION by ${session.userId}: consumed=${consumedQty}, wasted=${resolvedWastedQty}, returned=${returnedQty}${notes ? ` — ${notes}` : ''}`
            : `[${now.toISOString()}] RECONCILIATION by ${session.userId}: consumed=${consumedQty}, wasted=${resolvedWastedQty}, returned=${returnedQty}${notes ? ` — ${notes}` : ''}`,
        },
        include: {
          requestedBy: { select: { id: true, fullName: true, username: true } },
          workOrder: { select: { id: true, woNumber: true, title: true } },
          item: { select: { id: true, itemCode: true, name: true, currentStock: true } },
        },
      });

      let didReturn = false;
      // Return excess to inventory (if any)
      if (returnedQty > 0 && matReq.itemId) {
        const invItem = await tx.inventoryItem.findUnique({ where: { id: matReq.itemId } });
        if (invItem) {
          await tx.inventoryItem.update({
            where: { id: matReq.itemId },
            data: { currentStock: { increment: returnedQty } },
          });
          await tx.stockMovement.create({
            data: {
              itemId: matReq.itemId,
              type: 'in',
              quantity: returnedQty,
              previousStock: invItem.currentStock,
              newStock: invItem.currentStock + returnedQty,
              reason: `Reconciliation return from WO ${matReq.workOrder.woNumber} — ${matReq.itemName}`,
              referenceType: 'work_order',
              referenceId: matReq.workOrderId,
              performedById: session.userId,
              notes: `Reconciliation: ${consumedQty} consumed, ${resolvedWastedQty} wasted, ${returnedQty} returned`,
            },
          });
          didReturn = true;
        }
      }

      return { updated: req, returnedToInventory: didReturn };
    });

    // Audit trail
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'material_request_reconcile',
        entityType: 'repair_material_request',
        entityId: id,
        newValues: JSON.stringify({
          action: 'reconcile',
          status: updated.status,
          issuedQty,
          consumedQty,
          wastedQty: resolvedWastedQty,
          returnedQty,
          reconciliationRate: `${reconciliationRate.toFixed(1)}%`,
          wasteRate: `${wasteRate.toFixed(1)}%`,
          itemId: matReq.itemId || null,
        }),
      },
    });
    // Notify requester about reconciliation
    await notifyUser(
      matReq.requestedById,
      'repair_material_request',
      'Material Reconciliation Completed',
      `${matReq.itemName} for WO ${matReq.workOrder.woNumber}: ${consumedQty} consumed, ${resolvedWastedQty} wasted, ${returnedQty} returned. Rate: ${reconciliationRate.toFixed(1)}%`,
      'repair_material_request',
      id,
      `material-requests?id=${id}`,
    );

    // Notify planner
    if (matReq.workOrder.plannerId && matReq.workOrder.plannerId !== matReq.requestedById) {
      await notifyUser(
        matReq.workOrder.plannerId,
        'repair_material_request',
        'Material Reconciliation Report',
        `${matReq.itemName} for WO ${matReq.workOrder.woNumber}: ${consumedQty} consumed, ${resolvedWastedQty} wasted, ${returnedQty} returned`,
        'repair_material_request',
        id,
        `material-requests?id=${id}`,
      );
    }

    // Return reconciliation summary
    const reconciliation = {
      materialRequestId: id,
      itemName: matReq.itemName,
      woNumber: matReq.workOrder.woNumber,
      issuedQty,
      consumedQty,
      wastedQty: resolvedWastedQty,
      returnedQty,
      reconciliationRate: Number(reconciliationRate.toFixed(1)),
      wasteRate: Number(wasteRate.toFixed(1)),
      status: updated.status,
      reconciledBy: session.userId,
      reconciledAt: now.toISOString(),
      notes: notes || null,
      returnedToInventory: returnedToInventory,
    };

    return NextResponse.json({
      success: true,
      data: { materialRequest: updated, reconciliation },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reconcile material request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

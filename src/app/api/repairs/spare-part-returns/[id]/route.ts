import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { notifyUser } from '@/lib/notifications';
import { getPlantScope, canAccessPlantStrict } from '@/lib/plant-scope';

// GET /api/repairs/spare-part-returns/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;

    const sparePartReturn = await db.sparePartReturn.findUnique({
      where: { id },
      include: {
        workOrder: {
          select: {
            id: true, woNumber: true, title: true, status: true,
            assignee: { select: { id: true, fullName: true, avatar: true } },
            asset: { select: { id: true, name: true, assetTag: true } },
          },
        },
        component: { select: { id: true, componentCode: true, name: true, criticality: true, assetId: true } },
        materialRequest: { select: { id: true, itemName: true, quantity: true } },
        item: { select: { id: true, itemCode: true, name: true, currentStock: true, unitOfMeasure: true, binLocation: true } },
        requestedBy: { select: { id: true, fullName: true, username: true, avatar: true } },
        inspectedBy: { select: { id: true, fullName: true, username: true } },
        refurbisher: { select: { id: true, fullName: true, username: true } },
        returnedToStore: { select: { id: true, fullName: true, username: true } },
        disposedByUser: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!sparePartReturn) {
      return NextResponse.json({ success: false, error: 'Spare part return not found' }, { status: 404 });
    }

    // Plant scope validation via linked WO
    const plantScope = await getPlantScope(request, session);
    const plantId = sparePartReturn.workOrder?.plantId;
    if (plantScope.denyAccess || !canAccessPlantStrict(plantScope, plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: sparePartReturn });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch spare part return';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/repairs/spare-part-returns/[id] — update basic fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const existing = await db.sparePartReturn.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Spare part return not found' }, { status: 404 });
    }

    // Only allow updates on non-terminal statuses
    const terminalStatuses = ['returned_to_store', 'disposed', 'rejected'];
    if (terminalStatuses.includes(existing.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot update: return is in terminal status '${existing.status}'` },
        { status: 400 },
      );
    }

    // Ownership check: only the requester (or admin/supervisor/manager) can edit non-terminal returns
    if (!isAdmin(session) && !hasRole(session, 'maintenance_supervisor') && !hasRole(session, 'maintenance_manager') && !hasRole(session, 'plant_manager')) {
      if (existing.requestedById !== session.userId) {
        return NextResponse.json({ success: false, error: 'You can only edit your own spare part returns' }, { status: 403 });
      }
    }

    // Build update data (only allow certain fields)
    const allowedFields = ['itemName', 'partSerialNumber', 'quantity', 'conditionOnReturn', 'damageDescription', 'refurbishmentNotes', 'estimatedRefurbCost', 'componentId'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updateData as Record<string, unknown>)[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await db.sparePartReturn.update({
      where: { id },
      data: updateData,
      include: {
        workOrder: { select: { id: true, woNumber: true, title: true } },
        component: { select: { id: true, componentCode: true, name: true, criticality: true } },
        item: { select: { id: true, itemCode: true, name: true } },
        requestedBy: { select: { id: true, fullName: true } },
      },
    });

    await createAuditLog(session.userId, 'SparePartReturn', 'update', id, {
      oldValues: { ...updateData } as Record<string, unknown>,
      newValues: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update spare part return';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/spare-part-returns/[id] — workflow actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const existing = await db.sparePartReturn.findUnique({
      where: { id },
      include: {
        workOrder: { select: { id: true, woNumber: true, title: true } },
        item: true,
        requestedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Spare part return not found' }, { status: 404 });
    }

    const now = new Date();

    // ── INSPECT ──
    if (action === 'inspect') {
      if (existing.status !== 'pending') {
        return NextResponse.json({ success: false, error: `Cannot inspect: current status is '${existing.status}', expected 'pending'` }, { status: 400 });
      }
      // Role check: only store-related roles or admin can inspect returns
      if (!isAdmin(session) &&
          !hasRole(session, 'store_keeper') &&
          !hasRole(session, 'inventory_manager') &&
          !hasRole(session, 'tools_shop_attendant') &&
          !hasRole(session, 'maintenance_supervisor') &&
          !hasRole(session, 'maintenance_manager') &&
          !hasRole(session, 'plant_manager')) {
        return NextResponse.json({ success: false, error: 'Only authorized roles can inspect spare part returns' }, { status: 403 });
      }

      const { refurbishmentNeeded, inspectionNotes } = body;
      if (refurbishmentNeeded === undefined) {
        return NextResponse.json({ success: false, error: 'refurbishmentNeeded is required' }, { status: 400 });
      }

      const updated = await db.sparePartReturn.update({
        where: { id },
        data: {
          status: 'inspected',
          inspectedById: session.userId,
          inspectedAt: now,
          inspectionNotes: inspectionNotes || null,
          refurbishmentNeeded: Boolean(refurbishmentNeeded),
          refurbishmentNotes: body.refurbishmentNotes || null,
          estimatedRefurbCost: body.estimatedRefurbCost || null,
        },
        include: {
          workOrder: { select: { id: true, woNumber: true, title: true } },
          inspectedBy: { select: { id: true, fullName: true } },
        },
      });

      await createAuditLog(session.userId, 'SparePartReturn', 'inspect', id, {
        newValues: { status: 'inspected', refurbishmentNeeded, inspectionNotes },
      });

      // Notify requester
      await notifyUser(
        existing.requestedById,
        'spare_part_inspected',
        'Spare Part Return Inspected',
        `${existing.returnNumber}: ${refurbishmentNeeded ? 'Refurbishment needed' : 'Ready for return'}`,
        'spare_part_return', id, 'spare-part-returns',
      ).catch(() => {});

      return NextResponse.json({ success: true, data: updated });
    }

    // ── START_REHABILITATION ──
    if (action === 'start_refurbishment') {
      if (existing.status !== 'inspected') {
        return NextResponse.json({ success: false, error: `Cannot start refurbishment: current status is '${existing.status}'` }, { status: 400 });
      }
      if (!existing.refurbishmentNeeded) {
        return NextResponse.json({ success: false, error: 'Refurbishment not needed for this part' }, { status: 400 });
      }
      // Role check: only authorized roles can start refurbishment
      if (!isAdmin(session) &&
          !hasRole(session, 'maintenance_supervisor') &&
          !hasRole(session, 'maintenance_manager') &&
          !hasRole(session, 'plant_manager')) {
        return NextResponse.json({ success: false, error: 'Only admin or maintenance supervisors/managers can start refurbishment' }, { status: 403 });
      }

      const updated = await db.sparePartReturn.update({
        where: { id },
        data: {
          status: 'refurbishing',
          refurbisherId: session.userId,
          refurbishmentStart: now,
        },
        include: {
          workOrder: { select: { id: true, woNumber: true, title: true } },
          refurbisher: { select: { id: true, fullName: true } },
        },
      });

      await createAuditLog(session.userId, 'SparePartReturn', 'start_refurbishment', id, {
        newValues: { status: 'refurbishing', refurbisherId: session.userId },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // ── COMPLETE_REHABILITATION ──
    if (action === 'complete_refurbishment') {
      if (existing.status !== 'refurbishing') {
        return NextResponse.json({ success: false, error: `Cannot complete refurbishment: current status is '${existing.status}'` }, { status: 400 });
      }

      const { actualRefurbCost } = body;

      const updated = await db.sparePartReturn.update({
        where: { id },
        data: {
          status: 'refurbished',
          refurbishmentEnd: now,
          actualRefurbCost: actualRefurbCost ?? existing.estimatedRefurbCost ?? 0,
        },
        include: {
          workOrder: { select: { id: true, woNumber: true, title: true } },
          refurbisher: { select: { id: true, fullName: true } },
          item: { select: { id: true, itemCode: true, name: true } },
        },
      });

      await createAuditLog(session.userId, 'SparePartReturn', 'complete_refurbishment', id, {
        newValues: { status: 'refurbished', actualRefurbCost },
      });

      // Notify storekeeper that part is ready for return
      await notifyUser(
        session.userId,
        'spare_part_refurbished',
        'Spare Part Refurbishment Complete',
        `${existing.returnNumber}: Ready for return to store`,
        'spare_part_return', id, 'spare-part-returns',
      ).catch(() => {});

      return NextResponse.json({ success: true, data: updated });
    }

    // ── RETURN_TO_STORE ──
    if (action === 'return_to_store') {
      if (existing.status !== 'refurbished') {
        return NextResponse.json({ success: false, error: `Cannot return to store: current status is '${existing.status}'` }, { status: 400 });
      }
      // Role check: only store-related roles or admin can return to store
      if (!isAdmin(session) &&
          !hasRole(session, 'store_keeper') &&
          !hasRole(session, 'inventory_manager') &&
          !hasRole(session, 'tools_shop_attendant')) {
        return NextResponse.json({ success: false, error: 'Only admin, store keeper, inventory manager, or tools shop attendant can return parts to store' }, { status: 403 });
      }

      const updated = await db.sparePartReturn.update({
        where: { id },
        data: {
          status: 'returned_to_store',
          returnedToStoreById: session.userId,
          returnedToStoreAt: now,
        },
        include: {
          workOrder: { select: { id: true, woNumber: true, title: true } },
          item: { select: { id: true, itemCode: true, name: true, currentStock: true } },
          returnedToStore: { select: { id: true, fullName: true } },
        },
      });

      // Add stock back via StockMovement
      if (existing.itemId) {
        const item = await db.inventoryItem.findUnique({ where: { id: existing.itemId } });
        if (item) {
          const previousStock = item.currentStock;
          const newStock = previousStock + (existing.quantity || 1);

          await db.inventoryItem.update({
            where: { id: existing.itemId },
            data: { currentStock: newStock },
          });

          await db.stockMovement.create({
            data: {
              itemId: existing.itemId,
              type: 'in',
              quantity: existing.quantity || 1,
              previousStock,
              newStock,
              reason: `Spare part return ${existing.returnNumber} - returned to store`,
              referenceType: 'return',
              referenceId: existing.id,
              performedById: session.userId,
              notes: `WO: ${existing.workOrder?.woNumber || 'N/A'}`,
            },
          });
        }
      }

      await createAuditLog(session.userId, 'SparePartReturn', 'return_to_store', id, {
        newValues: { status: 'returned_to_store', itemId: existing.itemId, quantity: existing.quantity },
      });

      // Notify requester
      await notifyUser(
        existing.requestedById,
        'spare_part_returned_to_store',
        'Spare Part Returned to Store',
        `${existing.returnNumber} has been returned to store inventory`,
        'spare_part_return', id, 'spare-part-returns',
      ).catch(() => {});

      return NextResponse.json({ success: true, data: updated });
    }

    // ── DISPOSE ──
    if (action === 'dispose') {
      if (!['pending', 'inspected', 'refurbishing', 'refurbished'].includes(existing.status)) {
        return NextResponse.json({ success: false, error: `Cannot dispose: current status is '${existing.status}'` }, { status: 400 });
      }
      // Role check: only authorized roles can dispose parts
      if (!isAdmin(session) &&
          !hasRole(session, 'maintenance_supervisor') &&
          !hasRole(session, 'maintenance_manager') &&
          !hasRole(session, 'plant_manager') &&
          !hasRole(session, 'store_keeper') &&
          !hasRole(session, 'inventory_manager')) {
        return NextResponse.json({ success: false, error: 'Only authorized roles can dispose spare parts' }, { status: 403 });
      }

      const { disposalReason } = body;
      if (!disposalReason) {
        return NextResponse.json({ success: false, error: 'disposalReason is required' }, { status: 400 });
      }

      const updated = await db.sparePartReturn.update({
        where: { id },
        data: {
          status: 'disposed',
          disposedById: session.userId,
          disposedAt: now,
          disposalReason,
        },
        include: {
          workOrder: { select: { id: true, woNumber: true, title: true } },
          disposedByUser: { select: { id: true, fullName: true } },
        },
      });

      await createAuditLog(session.userId, 'SparePartReturn', 'dispose', id, {
        newValues: { status: 'disposed', disposalReason },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // ── REJECT ──
    if (action === 'reject') {
      if (existing.status !== 'pending') {
        return NextResponse.json({ success: false, error: `Cannot reject: current status is '${existing.status}'` }, { status: 400 });
      }
      // Role check: only store-related roles or admin can reject returns
      if (!isAdmin(session) &&
          !hasRole(session, 'store_keeper') &&
          !hasRole(session, 'inventory_manager') &&
          !hasRole(session, 'tools_shop_attendant') &&
          !hasRole(session, 'maintenance_supervisor') &&
          !hasRole(session, 'maintenance_manager') &&
          !hasRole(session, 'plant_manager')) {
        return NextResponse.json({ success: false, error: 'Only authorized roles can reject spare part returns' }, { status: 403 });
      }

      const { reason } = body;
      if (!reason) {
        return NextResponse.json({ success: false, error: 'reason is required for rejection' }, { status: 400 });
      }

      const updated = await db.sparePartReturn.update({
        where: { id },
        data: {
          status: 'rejected',
          inspectionNotes: `Rejected: ${reason}`,
          inspectedById: session.userId,
          inspectedAt: now,
        },
        include: {
          workOrder: { select: { id: true, woNumber: true, title: true } },
          inspectedBy: { select: { id: true, fullName: true } },
          requestedBy: { select: { id: true, fullName: true } },
        },
      });

      await createAuditLog(session.userId, 'SparePartReturn', 'reject', id, {
        newValues: { status: 'rejected', reason },
      });

      // Notify requester
      await notifyUser(
        existing.requestedById,
        'spare_part_rejected',
        'Spare Part Return Rejected',
        `${existing.returnNumber}: ${reason}`,
        'spare_part_return', id, 'spare-part-returns',
      ).catch(() => {});

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process spare part return action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

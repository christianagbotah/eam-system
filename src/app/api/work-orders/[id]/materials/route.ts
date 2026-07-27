import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

const VALID_URGENCIES = ['low', 'normal', 'medium', 'high', 'critical'];

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

    if (!hasAnyPermission(session, ['work_orders.update'])) {
      // Even without explicit permission, allow if the user is a team member or assignee
      const woCheck = await db.workOrder.findUnique({
        where: { id },
        select: { id: true, assignedTo: true, teamMembers: { select: { userId: true } } },
      });
      if (!woCheck || (woCheck.assignedTo !== session.userId && !woCheck.teamMembers.some(m => m.userId === session.userId))) {
        return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { itemName, itemId, quantity, unitCost, totalCost: providedTotalCost, reason, notes, urgency: rawUrgency, unit } = body;

    // If itemId provided but no itemName, resolve from inventory
    let resolvedItemName = itemName;
    let resolvedUnitCost = unitCost || null;
    if (!resolvedItemName && itemId) {
      const invItem = await db.inventoryItem.findUnique({
        where: { id: itemId },
        select: { name: true, unitCost: true },
      });
      if (invItem) {
        resolvedItemName = invItem.name || itemId;
        if (!resolvedUnitCost) resolvedUnitCost = invItem.unitCost;
      } else {
        resolvedItemName = itemId;
      }
    }

    if (!resolvedItemName) {
      return NextResponse.json(
        { success: false, error: 'itemName is required' },
        { status: 400 }
      );
    }

    // Validate urgency — map 'medium' to 'normal' for consistency
    const urgency = VALID_URGENCIES.includes(rawUrgency) ? (rawUrgency === 'medium' ? 'normal' : rawUrgency) : 'normal';

    const wo = await db.workOrder.findUnique({
      where: { id },
      select: { id: true, isLocked: true, assignedSupervisorId: true, plannerId: true, woNumber: true, plantId: true },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is permanently locked. No modifications are allowed after planner closure.' }, { status: 400 });
    }

    // Don't allow material requests once supervisor has verified
    const woForMaterials = await db.workOrder.findUnique({ where: { id }, select: { status: true } });
    if (woForMaterials && (woForMaterials.status === 'verified' || woForMaterials.status === 'closed')) {
      return NextResponse.json({ success: false, error: 'Work order has been reviewed and material requests are no longer allowed. Status: ' + woForMaterials.status }, { status: 400 });
    }

    // Auto-calculate totalCost if unitCost and quantity are provided
    const calculatedTotal =
      providedTotalCost !== undefined
        ? providedTotalCost
        : unitCost !== undefined && quantity !== undefined
          ? unitCost * quantity
          : undefined;

    const qtyRequested = quantity ?? 1;
    const estimatedCost = qtyRequested * (resolvedUnitCost || 0);

    // Create WO Material for cost tracking
    const material = await db.workOrderMaterial.create({
      data: {
        workOrderId: id,
        itemName: resolvedItemName,
        itemId: itemId || null,
        quantity: qtyRequested,
        unitCost: resolvedUnitCost,
        totalCost: (calculatedTotal ?? estimatedCost) || null,
        status: 'requested',
        requestedBy: session.userId,
      },
      include: {
        requester: { select: { id: true, fullName: true, username: true } },
        approver: { select: { id: true, fullName: true } },
        issuer: { select: { id: true, fullName: true } },
      },
    });

    // Also create a RepairMaterialRequest for the approval pipeline
    let repairMaterialRequest: any = null;
    try {
      // Check inventory availability for stock warning
      let stockWarning: string | null = null;
      if (itemId) {
        const invItem = await db.inventoryItem.findUnique({ where: { id: itemId }, select: { name: true, currentStock: true } });
        if (invItem && invItem.currentStock < qtyRequested) {
          stockWarning = `Insufficient stock for ${invItem.name}. Available: ${invItem.currentStock}, Requested: ${qtyRequested}. Shortfall: ${qtyRequested - invItem.currentStock}`;
        }
      }

      repairMaterialRequest = await db.repairMaterialRequest.create({
        data: {
          workOrderId: id,
          itemId: itemId || null,
          itemName: resolvedItemName,
          quantityRequested: qtyRequested,
          quantityApproved: 0,
          quantityIssued: 0,
          quantityReturned: 0,
          unit: unit || 'each',
          unitCost: resolvedUnitCost,
          estimatedCost,
          urgency,
          reason: reason || `Material requested for work order ${wo.woNumber}`,
          notes: notes || null,
          status: 'pending',
          requestedById: session.userId,
          plantId: wo.plantId || null,
        },
        include: {
          requestedBy: { select: { id: true, fullName: true } },
          workOrder: { select: { id: true, woNumber: true, title: true } },
          item: { select: { id: true, itemCode: true, name: true, currentStock: true } },
        },
      });

      // Notify supervisor for approval
      if (wo.assignedSupervisorId) {
        await notifyUser(
          wo.assignedSupervisorId,
          'repair_material_request',
          `${urgency === 'critical' ? '🔴 ' : urgency === 'high' ? '🟠 ' : ''}Material Request Pending Approval`,
          `Material requested: ${qtyRequested} ${unit || 'each'} of ${resolvedItemName} [${urgency.toUpperCase()}] for WO ${wo.woNumber}`,
          'repair_material_request',
          repairMaterialRequest.id,
          'maintenance-work-orders'
        );
      }

      // Notify planner if assigned
      if (wo.plannerId && wo.plannerId !== wo.assignedSupervisorId) {
        await notifyUser(
          wo.plannerId,
          'repair_material_request',
          'New Material Request Submitted',
          `${qtyRequested} ${unit || 'each'} of ${resolvedItemName} requested for WO ${wo.woNumber}`,
          'repair_material_request',
          repairMaterialRequest.id,
          'maintenance-work-orders'
        );
      }

      // Audit log for repair material request
      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'create',
          entityType: 'repair_material_request',
          entityId: repairMaterialRequest.id,
          newValues: JSON.stringify({
            workOrderId: id,
            itemName: resolvedItemName,
            quantityRequested: qtyRequested,
            urgency,
            reason: reason || `Material requested for work order ${wo.woNumber}`,
            source: 'wo_material_add',
          }),
        },
      });
    } catch (repairError: unknown) {
      // If repair_material_requests table doesn't exist on VPS, log but don't fail
      console.error('Failed to create repair material request (table may not exist):', repairError);
    }

    // Audit log for WO material
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'wo_material',
        entityId: material.id,
        newValues: JSON.stringify({
          workOrderId: id,
          itemName: resolvedItemName,
          itemId,
          quantity: qtyRequested,
          unitCost: resolvedUnitCost,
          totalCost: calculatedTotal ?? estimatedCost,
          repairMaterialRequestId: repairMaterialRequest?.id || null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...material,
        repairMaterialRequest: repairMaterialRequest ? {
          id: repairMaterialRequest.id,
          status: repairMaterialRequest.status,
          urgency: repairMaterialRequest.urgency,
        } : null,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add material';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

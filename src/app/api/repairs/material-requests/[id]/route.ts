import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/repairs/material-requests/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const matReq = await db.repairMaterialRequest.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, fullName: true, username: true, department: true } },
        supervisorApprovedBy: { select: { id: true, fullName: true } },
        storekeeperApprovedBy: { select: { id: true, fullName: true } },
        issuedByUser: { select: { id: true, fullName: true } },
        returnedByUser: { select: { id: true, fullName: true } },
        workOrder: {
          select: {
            id: true, woNumber: true, title: true, status: true,
            assignedSupervisor: { select: { id: true, fullName: true } },
            planner: { select: { id: true, fullName: true } },
          },
        },
        item: { select: { id: true, itemCode: true, name: true, currentStock: true, unitOfMeasure: true } },
      },
    });

    if (!matReq) return NextResponse.json({ success: false, error: 'Material request not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: matReq });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load material request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/repairs/material-requests/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const existing = await db.repairMaterialRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const allowedFields: Record<string, unknown> = {};
    if (body.quantityRequested !== undefined) allowedFields.quantityRequested = body.quantityRequested;
    if (body.unit !== undefined) allowedFields.unit = body.unit;
    if (body.unitCost !== undefined) allowedFields.unitCost = body.unitCost;
    if (body.reason !== undefined) allowedFields.reason = body.reason;
    if (body.notes !== undefined) allowedFields.notes = body.notes;

    const updated = await db.repairMaterialRequest.update({
      where: { id },
      data: allowedFields,
    });

    await db.auditLog.create({
      data: { userId: session.userId, action: 'update', entityType: 'repair_material_request', entityId: id, oldValues: JSON.stringify(existing), newValues: JSON.stringify(allowedFields) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update material request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/repairs/material-requests/[id] — cancel (only if pending)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const existing = await db.repairMaterialRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    if (existing.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Only pending requests can be cancelled' }, { status: 400 });
    }

    await db.repairMaterialRequest.delete({ where: { id } });

    await db.auditLog.create({
      data: { userId: session.userId, action: 'delete', entityType: 'repair_material_request', entityId: id, oldValues: JSON.stringify(existing) },
    });

    return NextResponse.json({ success: true, message: 'Material request cancelled' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel material request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/material-requests/[id] — workflow actions
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action, quantityApproved, notes } = body;

    const matReq = await db.repairMaterialRequest.findUnique({
      where: { id },
      include: {
        workOrder: { select: { id: true, woNumber: true, title: true, assignedSupervisorId: true, plannerId: true, assignedTo: true } },
        requestedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!matReq) return NextResponse.json({ success: false, error: 'Material request not found' }, { status: 404 });

    const now = new Date();
    let updated: typeof matReq;

    switch (action) {
      case 'supervisor_approve': {
        if (matReq.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot approve: current status is ${matReq.status}` }, { status: 400 });
        const qty = quantityApproved ?? matReq.quantityRequested;
        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: { status: 'supervisor_approved', supervisorApprovedById: session.userId, supervisorApprovedAt: now, quantityApproved: qty },
        });
        // Notify store keeper
        const storeKeepers = await db.user.findMany({
          where: { userRoles: { some: { role: { slug: 'store_keeper' } } }, status: 'active' },
          select: { id: true },
        });
        for (const sk of storeKeepers) {
          await db.notification.create({
            data: {
              userId: sk.id, type: 'repair_material_request',
              title: 'Material Request Awaiting Store Approval',
              message: `${qty} ${matReq.unit} of ${matReq.itemName} approved by supervisor for WO ${matReq.workOrder.woNumber}`,
              entityType: 'repair_material_request', entityId: id, actionUrl: 'maintenance-work-orders',
            },
          });
        }
        // Notify requester
        await db.notification.create({
          data: { userId: matReq.requestedById, type: 'repair_material_request', title: 'Material Request Supervisor Approved', message: `Your request for ${matReq.itemName} was approved by supervisor`, entityType: 'repair_material_request', entityId: id },
        });
        break;
      }

      case 'supervisor_reject': {
        if (matReq.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot reject: current status is ${matReq.status}` }, { status: 400 });
        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: { status: 'rejected', supervisorApprovedById: session.userId, supervisorApprovedAt: now, notes: notes ? `${matReq.notes || ''}\n[Rejected] ${notes}` : matReq.notes },
        });
        await db.notification.create({
          data: { userId: matReq.requestedById, type: 'repair_material_request', title: 'Material Request Rejected', message: `Your request for ${matReq.itemName} was rejected by supervisor${notes ? `: ${notes}` : ''}`, entityType: 'repair_material_request', entityId: id },
        });
        break;
      }

      case 'storekeeper_approve': {
        if (matReq.status !== 'supervisor_approved') return NextResponse.json({ success: false, error: `Cannot approve: current status is ${matReq.status}` }, { status: 400 });
        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: { status: 'storekeeper_approved', storekeeperApprovedById: session.userId, storekeeperApprovedAt: now },
        });
        await db.notification.create({
          data: { userId: matReq.requestedById, type: 'repair_material_request', title: 'Material Request Ready for Issuance', message: `${matReq.quantityApproved} ${matReq.unit} of ${matReq.itemName} approved by store keeper. Ready for pickup.`, entityType: 'repair_material_request', entityId: id },
        });
        break;
      }

      case 'storekeeper_reject': {
        if (matReq.status !== 'supervisor_approved') return NextResponse.json({ success: false, error: `Cannot reject: current status is ${matReq.status}` }, { status: 400 });
        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: { status: 'rejected', storekeeperApprovedById: session.userId, storekeeperApprovedAt: now, notes: notes ? `${matReq.notes || ''}\n[Rejected by Store] ${notes}` : matReq.notes },
        });
        await db.notification.create({
          data: { userId: matReq.requestedById, type: 'repair_material_request', title: 'Material Request Rejected by Store', message: `Your request for ${matReq.itemName} was rejected by store keeper${notes ? `: ${notes}` : ''}`, entityType: 'repair_material_request', entityId: id },
        });
        break;
      }

      case 'issue': {
        if (matReq.status !== 'storekeeper_approved') return NextResponse.json({ success: false, error: `Cannot issue: current status is ${matReq.status}` }, { status: 400 });
        const qtyToIssue = quantityApproved ?? matReq.quantityApproved;
        // Deduct from inventory
        if (matReq.itemId) {
          const invItem = await db.inventoryItem.findUnique({ where: { id: matReq.itemId } });
          if (invItem && invItem.currentStock < qtyToIssue) {
            return NextResponse.json({ success: false, error: `Insufficient stock. Available: ${invItem.currentStock}, Requested: ${qtyToIssue}` }, { status: 400 });
          }
          if (invItem) {
            await db.inventoryItem.update({
              where: { id: matReq.itemId },
              data: { currentStock: { decrement: qtyToIssue } },
            });
            await db.stockMovement.create({
              data: {
                itemId: matReq.itemId, type: 'out', quantity: qtyToIssue,
                previousStock: invItem.currentStock, newStock: invItem.currentStock - qtyToIssue,
                reason: `Issued for WO ${matReq.workOrder.woNumber}`, referenceType: 'work_order', referenceId: matReq.workOrderId, performedById: session.userId, notes: notes || null,
              },
            });
          }
        }
        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: { status: 'issued', quantityIssued: qtyToIssue, issuedById: session.userId, issuedAt: now },
        });
        await db.notification.create({
          data: { userId: matReq.requestedById, type: 'repair_material_request', title: 'Materials Issued', message: `${qtyToIssue} ${matReq.unit} of ${matReq.itemName} issued for WO ${matReq.workOrder.woNumber}`, entityType: 'repair_material_request', entityId: id },
        });
        break;
      }

      case 'record_return': {
        if (matReq.status !== 'issued' && matReq.status !== 'partially_returned') return NextResponse.json({ success: false, error: `Cannot record return: current status is ${matReq.status}` }, { status: 400 });
        const qtyToReturn = quantityApproved ?? 0;
        // Add back to inventory
        if (matReq.itemId && qtyToReturn > 0) {
          const invItem = await db.inventoryItem.findUnique({ where: { id: matReq.itemId } });
          if (invItem) {
            await db.inventoryItem.update({
              where: { id: matReq.itemId },
              data: { currentStock: { increment: qtyToReturn } },
            });
            await db.stockMovement.create({
              data: {
                itemId: matReq.itemId, type: 'in', quantity: qtyToReturn,
                previousStock: invItem.currentStock, newStock: invItem.currentStock + qtyToReturn,
                reason: `Returned from WO ${matReq.workOrder.woNumber}`, referenceType: 'work_order', referenceId: matReq.workOrderId, performedById: session.userId, notes: notes || null,
              },
            });
          }
        }
        const newReturnedQty = matReq.quantityReturned + qtyToReturn;
        const newStatus = newReturnedQty >= matReq.quantityIssued ? 'fully_returned' : 'partially_returned';
        updated = await db.repairMaterialRequest.update({
          where: { id },
          data: { status: newStatus, quantityReturned: newReturnedQty, returnedById: session.userId, returnedAt: now },
        });
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    await db.auditLog.create({
      data: { userId: session.userId, action: `material_request_${action}`, entityType: 'repair_material_request', entityId: id, newValues: JSON.stringify({ action, status: updated?.status }) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

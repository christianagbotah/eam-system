import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

// POST /api/repairs/material-requests/pick
// Moves a material request from storekeeper_approved → picking status
// Records picker name and timestamp
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Only store_keeper, store_manager, or admin can pick items
    if (!isAdmin(session) && !hasRole(session, 'store_keeper') && !hasRole(session, 'store_manager')) {
      return NextResponse.json(
        { success: false, error: 'Only store keeper, store manager, or admin can pick materials' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Material request ID is required' }, { status: 400 });
    }

    // Fetch the material request with work order info
    const matReq = await db.repairMaterialRequest.findUnique({
      where: { id },
      include: {
        workOrder: {
          select: { id: true, woNumber: true, title: true, assignedSupervisorId: true, plannerId: true },
        },
        requestedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!matReq) {
      return NextResponse.json({ success: false, error: 'Material request not found' }, { status: 404 });
    }

    // Validate current status — can only pick from storekeeper_approved (or store_approved)
    if (matReq.status !== 'storekeeper_approved' && matReq.status !== 'store_approved') {
      return NextResponse.json(
        { success: false, error: `Cannot pick: current status is '${matReq.status}'. Expected 'storekeeper_approved' or 'store_approved'.` },
        { status: 400 },
      );
    }

    const now = new Date();

    // Update the material request
    const updated = await db.repairMaterialRequest.update({
      where: { id },
      data: {
        status: 'picking',
        pickedAt: now,
        pickedBy: session.userId,
      },
      include: {
        requestedBy: { select: { id: true, fullName: true, username: true } },
        workOrder: { select: { id: true, woNumber: true, title: true } },
        item: { select: { id: true, itemCode: true, name: true, currentStock: true } },
      },
    });

    // Audit trail
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'material_request_pick',
        entityType: 'repair_material_request',
        entityId: id,
        newValues: JSON.stringify({
          action: 'pick',
          status: 'picking',
          pickedBy: session.userId,
          previousStatus: matReq.status,
          itemName: matReq.itemName,
          quantity: matReq.quantityApproved,
        }),
      },
    });

    // Notify requester that materials are being picked
    await notifyUser(
      matReq.requestedById,
      'repair_material_request',
      'Materials Being Picked',
      `${matReq.quantityApproved} ${matReq.unit} of ${matReq.itemName} is being picked for WO ${matReq.workOrder.woNumber}`,
      'repair_material_request',
      id,
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Material request moved to picking status',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to pick material request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

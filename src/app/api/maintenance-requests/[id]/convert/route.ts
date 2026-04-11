import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['maintenance_requests.update', 'maintenance_requests.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, priority } = body;

    const mr = await db.maintenanceRequest.findUnique({ where: { id } });
    if (!mr) {
      return NextResponse.json({ success: false, error: 'Maintenance request not found' }, { status: 404 });
    }

    if (mr.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: `Cannot convert a request with status "${mr.status}". Must be approved.` },
        { status: 400 }
      );
    }

    if (mr.workOrderId) {
      return NextResponse.json(
        { success: false, error: 'This request has already been converted to a work order' },
        { status: 400 }
      );
    }

    // Generate work order number
    const now = new Date();
    const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastWO = await db.workOrder.findFirst({
      where: { woNumber: { startsWith: `WO-${monthStr}` } },
      orderBy: { woNumber: 'desc' },
    });
    let seq = 1;
    if (lastWO) {
      const parts = lastWO.woNumber.split('-');
      seq = parseInt(parts[2] || '0', 10) + 1;
    }
    const woNumber = `WO-${monthStr}-${String(seq).padStart(4, '0')}`;

    // Create the work order
    const wo = await db.workOrder.create({
      data: {
        woNumber,
        title: title || `WO for ${mr.title}`,
        description: mr.description,
        type: 'corrective',
        priority: priority || mr.priority || 'medium',
        status: 'approved',
        maintenanceRequestId: mr.id,
        assetId: mr.assetId,
        departmentId: mr.departmentId,
        plantId: mr.plantId,
        estimatedHours: mr.estimatedHours,
        plannedStart: mr.plannedStart,
        plannedEnd: mr.plannedEnd,
        plannerId: session.userId,
      },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        planner: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    // Update the maintenance request
    await db.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'converted',
        workflowStatus: 'work_order_created',
        workOrderId: wo.id,
        assignedPlannerId: session.userId,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'maintenance_request',
        entityId: id,
        oldValues: JSON.stringify({ status: mr.status }),
        newValues: JSON.stringify({ status: 'converted', workOrderId: wo.id, woNumber: wo.woNumber }),
      },
    });

    return NextResponse.json({ success: true, data: wo }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to convert maintenance request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

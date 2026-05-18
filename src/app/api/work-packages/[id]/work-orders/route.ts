import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { workOrderIds } = body;

    if (!workOrderIds || !Array.isArray(workOrderIds) || workOrderIds.length === 0) {
      return NextResponse.json({ success: false, error: 'workOrderIds array is required' }, { status: 400 });
    }

    // Verify the work package exists
    const wp = await db.workPackage.findUnique({
      where: { id },
      include: { workOrders: { select: { id: true } } },
    });

    if (!wp) {
      return NextResponse.json({ success: false, error: 'Work package not found' }, { status: 404 });
    }

    if (wp.status === 'completed' || wp.status === 'cancelled') {
      return NextResponse.json({ success: false, error: `Cannot add work orders to a ${wp.status} work package` }, { status: 400 });
    }

    // Validate WOs exist and are not assigned to another package
    const existingWOs = await db.workOrder.findMany({
      where: { id: { in: workOrderIds } },
      select: { id: true, estimatedHours: true, workPackageId: true },
    });

    if (existingWOs.length !== workOrderIds.length) {
      return NextResponse.json({ success: false, error: 'One or more work orders not found' }, { status: 400 });
    }

    // Filter out WOs already assigned to THIS package
    const existingIds = new Set(wp.workOrders.map(wo => wo.id));
    const newWOs = existingWOs.filter(wo => !existingIds.has(wo.id));

    const alreadyAssigned = newWOs.filter(wo => wo.workPackageId !== null);
    if (alreadyAssigned.length > 0) {
      return NextResponse.json({ success: false, error: `${alreadyAssigned.length} work order(s) already belong to another work package` }, { status: 400 });
    }

    if (newWOs.length === 0) {
      return NextResponse.json({ success: false, error: 'All specified work orders are already in this work package' }, { status: 400 });
    }

    const newWOIds = newWOs.map(wo => wo.id);
    const additionalHours = newWOs.reduce((sum, wo) => sum + (wo.estimatedHours || 0), 0);

    // Update WOs to link them to this package
    await db.workOrder.updateMany({
      where: { id: { in: newWOIds } },
      data: { workPackageId: id },
    });

    // Update total estimated hours on the package
    const updated = await db.workPackage.update({
      where: { id },
      data: {
        totalEstimatedHours: { increment: additionalHours },
      },
      include: {
        workOrders: {
          select: {
            id: true,
            woNumber: true,
            title: true,
            status: true,
            priority: true,
            estimatedHours: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_package',
        entityId: id,
        oldValues: null,
        newValues: JSON.stringify({
          action: 'add_work_orders',
          workOrderIds: newWOIds,
          count: newWOs.length,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated, addedCount: newWOs.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add work orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const workOrderIdsStr = searchParams.get('workOrderIds');

    if (!workOrderIdsStr) {
      return NextResponse.json({ success: false, error: 'workOrderIds query parameter is required' }, { status: 400 });
    }

    const workOrderIds = workOrderIdsStr.split(',').filter(Boolean);

    if (workOrderIds.length === 0) {
      return NextResponse.json({ success: false, error: 'workOrderIds query parameter is required' }, { status: 400 });
    }

    // Verify the work package exists
    const wp = await db.workPackage.findUnique({
      where: { id },
    });

    if (!wp) {
      return NextResponse.json({ success: false, error: 'Work package not found' }, { status: 404 });
    }

    if (wp.status === 'completed' || wp.status === 'cancelled') {
      return NextResponse.json({ success: false, error: `Cannot modify a ${wp.status} work package` }, { status: 400 });
    }

    // Get hours for removed WOs before unlinking
    const removedWOs = await db.workOrder.findMany({
      where: { id: { in: workOrderIds }, workPackageId: id },
      select: { estimatedHours: true },
    });
    const removedHours = removedWOs.reduce((sum, wo) => sum + (wo.estimatedHours || 0), 0);

    // Unlink WOs
    const result = await db.workOrder.updateMany({
      where: { id: { in: workOrderIds }, workPackageId: id },
      data: { workPackageId: null },
    });

    if (result.count === 0) {
      return NextResponse.json({ success: false, error: 'None of the specified work orders were found in this work package' }, { status: 400 });
    }

    // Update total estimated hours
    const updated = await db.workPackage.update({
      where: { id },
      data: {
        totalEstimatedHours: Math.max(0, wp.totalEstimatedHours - removedHours),
      },
      include: {
        workOrders: {
          select: {
            id: true,
            woNumber: true,
            title: true,
            status: true,
            priority: true,
            estimatedHours: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_package',
        entityId: id,
        oldValues: null,
        newValues: JSON.stringify({
          action: 'remove_work_orders',
          workOrderIds,
          count: result.count,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated, removedCount: result.count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove work orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const asset = await db.asset.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, code: true } },
        plant: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        parent: { select: { id: true, name: true, assetTag: true } },
        children: {
          select: { id: true, name: true, assetTag: true, status, condition },
          orderBy: { name: 'asc' },
        },
        assignedTo: { select: { id: true, fullName: true, username: true, department: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        pmSchedules: {
          where: { isActive: true },
          orderBy: { nextDueDate: 'asc' },
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Also fetch related maintenance requests and work orders by assetId
    const [maintenanceRequests, workOrders] = await Promise.all([
      db.maintenanceRequest.findMany({
        where: { assetId: id },
        select: { id: true, requestNumber: true, title: true, status, priority, createdAt },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.workOrder.findMany({
        where: { assetId: id },
        select: { id: true, woNumber: true, title: true, status, type, priority, createdAt },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...asset,
        maintenanceRequests,
        workOrders,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load asset';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'description', 'categoryId', 'serialNumber', 'manufacturer', 'model',
      'yearManufactured', 'condition', 'status', 'criticality', 'location',
      'building', 'floor', 'area', 'plantId', 'departmentId', 'purchaseCost',
      'expectedLifeYears', 'currentValue', 'depreciationRate', 'imageUrl',
      'drawingsUrl', 'manualUrl', 'specification', 'parentId', 'assignedToId',
      'isActive',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (['purchaseDate', 'warrantyExpiry', 'installedDate'].includes(field)) {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Prevent self-parent
    if (updateData.parentId === id) {
      return NextResponse.json(
        { success: false, error: 'Asset cannot be its own parent' },
        { status: 400 }
      );
    }

    const updated = await db.asset.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, code: true } },
        plant: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'asset',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update asset';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Soft delete (isActive=false)
    const deactivated = await db.asset.update({
      where: { id },
      data: { isActive: false },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'asset',
        entityId: id,
        oldValues: JSON.stringify({ assetTag: existing.assetTag, isActive: existing.isActive }),
        newValues: JSON.stringify({ isActive: false }),
      },
    });

    return NextResponse.json({ success: true, data: deactivated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate asset';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

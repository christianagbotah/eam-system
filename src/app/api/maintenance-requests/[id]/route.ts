import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { getPlantScope } from '@/lib/plant-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (!hasPermission(session, 'maintenance_requests.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const mr = await db.maintenanceRequest.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, serialNumber: true } },
        requester: { select: { id: true, fullName: true, username: true, department: true } },
        supervisor: { select: { id: true, fullName: true, username: true } },
        approver: { select: { id: true, fullName: true, username: true } },
        assignedPlanner: { select: { id: true, fullName: true, username: true } },
        workOrder: {
          select: {
            id: true,
            woNumber: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        comments: {
          include: { user: { select: { id: true, fullName: true, username: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!mr) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // IDOR protection: ensure user has access to this MR's plant
    if (mr.plantId) {
      const plantScope = await getPlantScope(request, session);
      if (plantScope.isScoped && plantScope.plantId && mr.plantId !== plantScope.plantId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: mr });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load maintenance request';
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

    if (!hasPermission(session, 'maintenance_requests.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.maintenanceRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Only allow updates if not already approved/rejected/converted
    if (['approved', 'rejected', 'converted'].includes(existing.status)) {
      // Only allow updating notes
      if (body.notes !== undefined) {
        const updated = await db.maintenanceRequest.update({
          where: { id },
          data: { notes: body.notes },
          include: {
            requester: { select: { id: true, fullName: true, username: true } },
            supervisor: { select: { id: true, fullName: true, username: true } },
          },
        });
        return NextResponse.json({ success: true, data: updated });
      }
      return NextResponse.json(
        { success: false, error: `Cannot update a request with status "${existing.status}"` },
        { status: 400 }
      );
    }

    // Build update data (only allow certain fields)
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'priority', 'category',
      'assetId', 'departmentId', 'plantId', 'machineDownStatus',
      'estimatedHours', 'slaHours', 'plannedStart', 'plannedEnd', 'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'plannedStart' || field === 'plannedEnd') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.maintenanceRequest.update({
      where: { id },
      data: updateData,
      include: {
        asset: { select: { id: true, name: true, assetTag: true, serialNumber: true } },
        requester: { select: { id: true, fullName: true, username: true } },
        supervisor: { select: { id: true, fullName: true, username: true } },
        approver: { select: { id: true, fullName: true, username: true } },
        assignedPlanner: { select: { id: true, fullName: true, username: true } },
        workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update maintenance request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

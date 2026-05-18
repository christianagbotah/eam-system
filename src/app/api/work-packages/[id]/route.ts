import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const workPackage = await db.workPackage.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        plant: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        workOrders: {
          include: {
            assignee: { select: { id: true, fullName: true, username: true } },
            teamLeader: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!workPackage) {
      return NextResponse.json({ success: false, error: 'Work package not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: workPackage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work package';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const {
      name,
      description,
      assignedToId,
      scheduledDate,
      shift,
      status,
      notes,
    } = body;

    // Verify the work package exists
    const existing = await db.workPackage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Work package not found' }, { status: 404 });
    }

    // Validate status transitions
    const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (shift !== undefined) updateData.shift = shift;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // Recalculate actual hours when completing
    if (status === 'completed') {
      const linkedWOs = await db.workOrder.findMany({
        where: { workPackageId: id },
        select: { actualHours: true },
      });
      updateData.totalActualHours = linkedWOs.reduce((sum, wo) => sum + (wo.actualHours || 0), 0);
    }

    // Audit: get old values
    const oldValues = JSON.stringify({
      name: existing.name,
      status: existing.status,
      assignedToId: existing.assignedToId,
      scheduledDate: existing.scheduledDate,
      shift: existing.shift,
    });

    const updated = await db.workPackage.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        plant: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        workOrders: {
          select: {
            id: true,
            woNumber: true,
            title: true,
            status: true,
            priority: true,
            estimatedHours: true,
            actualHours: true,
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
        oldValues,
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update work package';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!isAdmin(session) && !hasPermission(session, 'work_orders.delete')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Verify the work package exists
    const existing = await db.workPackage.findUnique({
      where: { id },
      include: {
        workOrders: { select: { id: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Work package not found' }, { status: 404 });
    }

    if (existing.status === 'in_progress' && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Cannot delete a work package that is in progress. Cancel it first.' }, { status: 400 });
    }

    // Unlink work orders (set workPackageId to null)
    if (existing.workOrders.length > 0) {
      await db.workOrder.updateMany({
        where: { workPackageId: id },
        data: { workPackageId: null },
      });
    }

    // Set status to cancelled then delete
    await db.workPackage.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'work_package',
        entityId: id,
        oldValues: JSON.stringify({
          name: existing.name,
          status: existing.status,
          workOrderCount: existing.workOrders.length,
        }),
        newValues: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Work package "${existing.name}" deleted. ${existing.workOrders.length} work order(s) unlinked.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete work package';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

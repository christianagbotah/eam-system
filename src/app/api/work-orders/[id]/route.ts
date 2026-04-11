import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const wo = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, username: true, department: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        assigner: { select: { id: true, fullName: true, username: true } },
        planner: { select: { id: true, fullName: true, username: true } },
        locker: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: {
          select: {
            id: true,
            requestNumber: true,
            title: true,
            requester: { select: { id: true, fullName: true, username: true } },
          },
        },
        pmSchedule: { select: { id: true, title: true, frequencyType: true, frequencyValue: true } },
        teamMembers: {
          include: { user: { select: { id: true, fullName: true, username: true } } },
          orderBy: { assignedAt: 'asc' },
        },
        timeLogs: {
          include: { user: { select: { id: true, fullName: true, username: true } } },
          orderBy: { timestamp: 'desc' },
        },
        materials: {
          include: {
            requester: { select: { id: true, fullName: true } },
            approver: { select: { id: true, fullName: true } },
            issuer: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: { user: { select: { id: true, fullName: true, username: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wo) {
      return NextResponse.json(
        { success: false, error: 'Work order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: wo });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work order';
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

    const existing = await db.workOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Work order not found' },
        { status: 404 }
      );
    }

    // Don't allow updates on locked WOs
    if (existing.isLocked && !session.roles.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Work order is locked' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'type', 'priority',
      'assetId', 'assetName', 'departmentId', 'plantId',
      'estimatedHours', 'plannedStart', 'plannedEnd',
      'totalCost', 'laborCost', 'partsCost', 'contractorCost',
      'failureDescription', 'causeDescription', 'actionDescription',
      'notes',
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

    const updated = await db.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, fullName: true } },
        teamLeader: { select: { id: true, fullName: true } },
        assignedSupervisor: { select: { id: true, fullName: true } },
        assigner: { select: { id: true, fullName: true } },
        planner: { select: { id: true, fullName: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
        teamMembers: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { assignedAt: 'asc' },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_order',
        entityId: id,
        oldValues: JSON.stringify({ title: existing.title, priority: existing.priority }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

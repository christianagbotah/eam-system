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

    if (!hasAnyPermission(session, ['work_orders.assign', 'work_orders.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { assignedTo, teamLeaderId, assignedSupervisorId, assignmentType } = body;

    if (!assignedTo) {
      return NextResponse.json(
        { success: false, error: 'assignedTo (user ID) is required' },
        { status: 400 }
      );
    }

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Validate status transition
    if (!['draft', 'requested', 'approved', 'planned'].includes(wo.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot assign work order with status "${wo.status}"` },
        { status: 400 }
      );
    }

    // Verify the assigned user exists
    const assignee = await db.user.findUnique({ where: { id: assignedTo } });
    if (!assignee) {
      return NextResponse.json({ success: false, error: 'Assigned user not found' }, { status: 400 });
    }

    const now = new Date();

    const updated = await db.workOrder.update({
      where: { id },
      data: {
        assignedTo,
        teamLeaderId: teamLeaderId || null,
        assignedSupervisorId: assignedSupervisorId || null,
        assignedBy: session.userId,
        assignmentType: assignmentType || 'direct',
        status: 'assigned',
      },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        assigner: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    // Add assignee as team member if not already present
    const existingMember = await db.workOrderTeamMember.findFirst({
      where: { workOrderId: id, userId: assignedTo },
    });
    if (!existingMember) {
      await db.workOrderTeamMember.create({
        data: {
          workOrderId: id,
          userId: assignedTo,
          role: teamLeaderId === assignedTo ? 'team_leader' : 'assistant',
          assignedAt: now,
        },
      });
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_order',
        entityId: id,
        oldValues: JSON.stringify({ status: wo.status }),
        newValues: JSON.stringify({
          status: 'assigned',
          assignedTo: assignee.fullName,
          assignmentType: assignmentType || 'direct',
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to assign work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

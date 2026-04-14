import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { executeTransition } from '@/lib/state-machine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['work_orders.assign', 'work_orders.assign_supervisor', 'work_orders.assign_technician', 'work_orders.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { assignedTo, teamLeaderId, assignedSupervisorId, assignmentType, teamMembers } = body;

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

    // Verify the assigned user exists
    const assignee = await db.user.findUnique({ where: { id: assignedTo } });
    if (!assignee) {
      return NextResponse.json({ success: false, error: 'Assigned user not found' }, { status: 400 });
    }

    const now = new Date();

    // Execute status transition via state machine (validates + updates status + creates history)
    const result = await executeTransition(
      'work_order',
      id,
      'assigned',
      session,
      {
        extraData: {
          assignedTo,
          teamLeaderId: teamLeaderId || null,
          assignedSupervisorId: assignedSupervisorId || null,
          assignedBy: session.userId,
          assignmentType: assignmentType || 'direct',
        },
      },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Add assignee as team member if not already present
    const existingMember = await db.workOrderTeamMember.findFirst({
      where: { workOrderId: id, userId: assignedTo },
    });
    if (!existingMember) {
      const isTeamLeader = assignedTo === teamLeaderId;
      await db.workOrderTeamMember.create({
        data: {
          workOrderId: id,
          userId: assignedTo,
          role: isTeamLeader ? 'team_leader' : 'assistant',
          accessLevel: isTeamLeader ? 'full' : 'read_only',
          assignedAt: now,
        },
      });
    }

    // Create team member records if teamMembers array is provided
    if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
      for (const member of teamMembers) {
        if (!member.userId || !member.role) continue;

        // Skip if already a team member
        const alreadyMember = await db.workOrderTeamMember.findFirst({
          where: { workOrderId: id, userId: member.userId },
        });
        if (alreadyMember) continue;

        const isTeamLeader = member.userId === teamLeaderId;
        await db.workOrderTeamMember.create({
          data: {
            workOrderId: id,
            userId: member.userId,
            role: isTeamLeader ? 'team_leader' : member.role,
            accessLevel: isTeamLeader ? 'full' : 'read_only',
            assignedAt: now,
          },
        });
      }
    }

    // Domain-specific audit log (status change is handled by state machine via WorkOrderStatusHistory)
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_order',
        entityId: id,
        oldValues: JSON.stringify({ assignedTo: null }),
        newValues: JSON.stringify({
          assignedTo: assignee.fullName,
          assignmentType: assignmentType || 'direct',
          teamMembersCount: teamMembers?.length || 1,
        }),
      },
    });

    // Notify the assigned user
    if (assignedTo !== session.userId) {
      await notifyUser(
        assignedTo,
        'wo_assigned',
        'Work Order Assigned',
        `You have been assigned ${wo.woNumber}: ${wo.title}`,
        'work_order',
        id,
        `wo-detail?id=${id}`,
      );
    }

    // Notify team members (excluding assignee and session user)
    if (teamMembers && Array.isArray(teamMembers)) {
      for (const member of teamMembers) {
        if (member.userId !== session.userId && member.userId !== assignedTo) {
          await notifyUser(
            member.userId,
            'wo_assigned',
            'Work Order Team Assignment',
            `You have been assigned to team for ${wo.woNumber}: ${wo.title}`,
            'work_order',
            id,
            `wo-detail?id=${id}`,
          );
        }
      }
    }

    // Re-fetch with includes to return full object (state machine returns plain record)
    const updated = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        assigner: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to assign work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

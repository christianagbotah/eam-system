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

    if (!hasAnyPermission(session, ['maintenance_requests.update', 'maintenance_requests.convert_to_wo', 'maintenance_requests.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      title,
      priority,
      assignmentType,
      assignedTo,
      teamLeaderId,
      teamMembers,
      assignedSupervisorId,
      failureDescription,
      causeDescription,
      actionDescription,
      estimatedHours,
      plannedStart,
      plannedEnd,
    } = body;

    const mr = await db.maintenanceRequest.findUnique({ where: { id } });
    if (!mr) {
      return NextResponse.json({ success: false, error: 'Maintenance request not found' }, { status: 404 });
    }

    if (mr.workOrderId) {
      return NextResponse.json(
        { success: false, error: 'This request has already been converted to a work order' },
        { status: 400 }
      );
    }

    // Validate team members if provided
    if (teamMembers && Array.isArray(teamMembers)) {
      for (const member of teamMembers) {
        if (!member.userId || !member.role) {
          return NextResponse.json(
            { success: false, error: 'Each team member must have userId and role' },
            { status: 400 }
          );
        }
      }
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

    // Determine initial WO status: "assigned" if assignee/team provided, otherwise "approved"
    const hasAssignment = assignedTo || (teamMembers && teamMembers.length > 0);
    const woStatus = hasAssignment ? 'assigned' : 'approved';

    // Create the work order
    const wo = await db.workOrder.create({
      data: {
        woNumber,
        title: title || `WO for ${mr.title}`,
        description: mr.description,
        type: 'corrective',
        priority: priority || mr.priority || 'medium',
        status: woStatus,
        maintenanceRequestId: mr.id,
        assetId: mr.assetId,
        departmentId: mr.departmentId,
        plantId: mr.plantId,
        estimatedHours: estimatedHours ?? mr.estimatedHours,
        plannedStart: plannedStart ? new Date(plannedStart) : mr.plannedStart,
        plannedEnd: plannedEnd ? new Date(plannedEnd) : mr.plannedEnd,
        plannerId: session.userId,
        assignedTo: assignedTo || null,
        teamLeaderId: teamLeaderId || null,
        assignedSupervisorId: assignedSupervisorId || null,
        assignmentType: assignmentType || (assignedTo ? 'direct' : null),
        assignedBy: session.userId,
        failureDescription: failureDescription || null,
        causeDescription: causeDescription || null,
        actionDescription: actionDescription || null,
      },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        planner: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    // Create team member records if provided
    if (teamMembers && teamMembers.length > 0) {
      const teamMemberData = teamMembers.map((member: { userId: string; role: string }) => {
        const isTeamLeader = member.userId === teamLeaderId;
        return {
          workOrderId: wo.id,
          userId: member.userId,
          role: isTeamLeader ? 'team_leader' : member.role,
          accessLevel: isTeamLeader ? 'full' : 'read_only',
          assignedAt: now,
        };
      });

      await db.workOrderTeamMember.createMany({ data: teamMemberData });
    }

    // If assignedTo is provided but not in teamMembers, ensure they're a team member too
    if (assignedTo && !(teamMembers && teamMembers.some((m: { userId: string }) => m.userId === assignedTo))) {
      const isTeamLeader = assignedTo === teamLeaderId;
      const existingMember = await db.workOrderTeamMember.findFirst({
        where: { workOrderId: wo.id, userId: assignedTo },
      });
      if (!existingMember) {
        await db.workOrderTeamMember.create({
          data: {
            workOrderId: wo.id,
            userId: assignedTo,
            role: isTeamLeader ? 'team_leader' : 'assistant',
            accessLevel: isTeamLeader ? 'full' : 'read_only',
            assignedAt: now,
          },
        });
      }
    }

    // Execute MR status transition via state machine (validates + updates + creates comment)
    const result = await executeTransition(
      'maintenance_request',
      id,
      'converted',
      session,
      {
        extraData: {
          workOrderId: wo.id,
          workflowStatus: 'work_order_created',
          assignedPlannerId: session.userId,
        },
      },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Domain-specific audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'maintenance_request',
        entityId: id,
        oldValues: JSON.stringify({}),
        newValues: JSON.stringify({
          workOrderId: wo.id,
          woNumber: wo.woNumber,
          assignedTo: assignedTo || null,
          teamLeaderId: teamLeaderId || null,
          teamMembersCount: teamMembers?.length || 0,
          assignmentType: assignmentType || null,
        }),
      },
    });

    // Notify the requester that the MR was converted
    if (mr.requestedBy && mr.requestedBy !== session.userId) {
      await notifyUser(
        mr.requestedBy,
        'mr_converted',
        'MR Converted to Work Order',
        `Your request has been converted to WO ${wo.woNumber}`,
        'work_order',
        wo.id,
        `wo-detail?id=${wo.id}`,
      );
    }

    // Notify team leader if provided
    if (teamLeaderId && teamLeaderId !== session.userId) {
      await notifyUser(
        teamLeaderId,
        'wo_assigned',
        'Work Order Team Lead Assignment',
        `You have been assigned as team leader for ${wo.woNumber}: ${wo.title}`,
        'work_order',
        wo.id,
        `wo-detail?id=${wo.id}`,
      );
    }

    // Notify direct assignee if provided and different from team leader
    if (assignedTo && assignedTo !== session.userId && assignedTo !== teamLeaderId) {
      await notifyUser(
        assignedTo,
        'wo_assigned',
        'Work Order Assigned',
        `You have been assigned ${wo.woNumber}: ${wo.title}`,
        'work_order',
        wo.id,
        `wo-detail?id=${wo.id}`,
      );
    }

    // Notify team members
    if (teamMembers && teamMembers.length > 0) {
      for (const member of teamMembers) {
        if (member.userId !== session.userId && member.userId !== assignedTo && member.userId !== teamLeaderId) {
          await notifyUser(
            member.userId,
            'wo_assigned',
            'Work Order Team Assignment',
            `You have been assigned to team for ${wo.woNumber}: ${wo.title}`,
            'work_order',
            wo.id,
            `wo-detail?id=${wo.id}`,
          );
        }
      }
    }

    // Notify supervisor when assignment type is via_supervisor
    if (assignedSupervisorId && assignedSupervisorId !== session.userId) {
      await notifyUser(
        assignedSupervisorId,
        'wo_assigned',
        'Work Order Pending Your Review',
        `Work order ${wo.woNumber} has been created and assigned to your team for review`,
        'work_order',
        wo.id,
        `wo-detail?id=${wo.id}`,
      );
    }

    return NextResponse.json({ success: true, data: wo }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to convert maintenance request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

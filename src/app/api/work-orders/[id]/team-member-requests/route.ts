import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

/**
 * GET /api/work-orders/[id]/team-member-requests
 * List team member requests for a WO.
 * - Admins/planners/assigner see all requests
 * - Technicians/team members see their own requests
 */
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

    // Fetch WO with assigner info
    const wo = await db.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        assignedBy: true,
        teamLeaderId: true,
        assignedTo: true,
        teamMembers: { select: { userId: true } },
      },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Determine if user can see all requests (admin/planner/assigner)
    const canManageTeam = isAdmin(session) ||
      hasAnyPermission(session, ['work_orders.assign', 'work_orders.*']) ||
      wo.assignedBy === session.userId;

    // Build where clause: admins see all, others see their own
    const where: any = { workOrderId: id };
    if (!canManageTeam) {
      where.requestedBy = session.userId;
    }

    const requests = await db.woTeamMemberRequest.findMany({
      where,
      include: {
        requestedByUser: { select: { id: true, fullName: true, username: true } },
        requestedUser: { select: { id: true, fullName: true, username: true, department: true } },
        reviewedByUser: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch team member requests';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/work-orders/[id]/team-member-requests
 * Create a team member request.
 * - Technicians and team members can request
 * - The request is sent to the assigner for approval
 */
export async function POST(
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
    const { requestedUserId, role, reason } = body;

    if (!requestedUserId) {
      return NextResponse.json({ success: false, error: 'requestedUserId is required' }, { status: 400 });
    }

    // Fetch WO
    const wo = await db.workOrder.findUnique({
      where: { id },
      include: {
        assigner: { select: { id: true, fullName: true } },
        teamMembers: { select: { userId: true } },
      },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is permanently locked.' }, { status: 400 });
    }

    // Only allow if user is a team member, assignee, or admin/planner
    const isTeamMember = wo.teamMembers?.some(tm => tm.userId === session.userId);
    const isAssignee = wo.assignedTo === session.userId;
    const isAdminUser = isAdmin(session);
    const canManageTeam = hasAnyPermission(session, ['work_orders.assign', 'work_orders.*']) || isAdminUser;

    if (!isTeamMember && !isAssignee && !canManageTeam) {
      return NextResponse.json(
        { success: false, error: 'Only team members or the assigned technician can request additional members.' },
        { status: 403 }
      );
    }

    // Verify the requested user exists
    const targetUser = await db.user.findUnique({
      where: { id: requestedUserId },
      select: { id: true, fullName: true, status: true },
    });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Requested user not found' }, { status: 400 });
    }
    if (targetUser.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Requested user is not active' }, { status: 400 });
    }

    // Check not already a team member
    const alreadyMember = wo.teamMembers?.some(tm => tm.userId === requestedUserId);
    if (alreadyMember) {
      return NextResponse.json(
        { success: false, error: 'User is already a team member of this work order' },
        { status: 409 }
      );
    }

    // Check for duplicate pending request
    const existingPending = await db.woTeamMemberRequest.findFirst({
      where: {
        workOrderId: id,
        requestedUserId,
        status: 'pending',
      },
    });
    if (existingPending) {
      return NextResponse.json(
        { success: false, error: 'A pending request already exists for this user on this work order' },
        { status: 409 }
      );
    }

    // Create the request
    const teamRequest = await db.woTeamMemberRequest.create({
      data: {
        workOrderId: id,
        requestedBy: session.userId,
        requestedUserId,
        role: role || 'assistant',
        reason: reason || null,
      },
      include: {
        requestedByUser: { select: { id: true, fullName: true, username: true } },
        requestedUser: { select: { id: true, fullName: true, username: true, department: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'wo_team_member_request',
        entityId: teamRequest.id,
        newValues: JSON.stringify({
          workOrderId: id,
          requestedUser: targetUser.fullName,
          role: role || 'assistant',
          reason: reason || null,
        }),
      },
    });

    // Notify the assigner (person who assigned the WO) about the new request
    const approverId = wo.assignedBy;
    if (approverId && approverId !== session.userId) {
      await notifyUser(
        approverId,
        'wo_team_request',
        'Team Member Request',
        `${session.username} requested ${targetUser.fullName} to join WO ${wo.woNumber || id.slice(-6)}`,
        'work_order',
        id,
        `/maintenance?tab=work-orders&view=${id}`,
      );
    }

    return NextResponse.json({ success: true, data: teamRequest }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create team member request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

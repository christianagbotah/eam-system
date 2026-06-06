import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

/**
 * PUT /api/work-orders/[id]/team-member-requests/[reqId]
 * Approve or reject a team member request.
 * - Only the assigner, admin, or users with work_orders.assign permission can review
 * - On approve: automatically adds the team member to the WO
 * - On reject: notifies the requester
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id, reqId } = await params;
    const body = await request.json();
    const { action, reviewNotes } = body; // action: "approve" | "reject"

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    // Fetch WO
    const wo = await db.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        woNumber: true,
        title: true,
        assignedBy: true,
        isLocked: true,
        teamMembers: { select: { userId: true } },
      },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is permanently locked.' }, { status: 400 });
    }

    // Permission check: only assigner, admin, or users with assign permission can review
    const canReview = isAdmin(session) ||
      hasAnyPermission(session, ['work_orders.assign', 'work_orders.*']) ||
      wo.assignedBy === session.userId;

    if (!canReview) {
      return NextResponse.json(
        { success: false, error: 'Only the person who assigned this work order or an admin/planner can review team member requests.' },
        { status: 403 }
      );
    }

    // Fetch the request
    const teamRequest = await db.woTeamMemberRequest.findUnique({
      where: { id: reqId },
      include: {
        requestedByUser: { select: { id: true, fullName: true, username: true } },
        requestedUser: { select: { id: true, fullName: true, username: true, department: true } },
      },
    });
    if (!teamRequest) {
      return NextResponse.json({ success: false, error: 'Team member request not found' }, { status: 404 });
    }

    if (teamRequest.workOrderId !== id) {
      return NextResponse.json({ success: false, error: 'Request does not belong to this work order' }, { status: 400 });
    }

    if (teamRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Request has already been ${teamRequest.status}` },
        { status: 409 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    if (action === 'approve') {
      // Check not already a team member (could have been added since request was created)
      const alreadyMember = wo.teamMembers?.some(tm => tm.userId === teamRequest.requestedUserId);
      if (alreadyMember) {
        // Still mark as approved but don't create duplicate
        await db.woTeamMemberRequest.update({
          where: { id: reqId },
          data: {
            status: 'approved',
            reviewedBy: session.userId,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || 'Already a team member',
          },
        });
        return NextResponse.json({
          success: true,
          data: { ...teamRequest, status: 'approved', message: 'User is already a team member' },
        });
      }

      // Add the team member
      await db.workOrderTeamMember.create({
        data: {
          workOrderId: id,
          userId: teamRequest.requestedUserId,
          role: teamRequest.role,
          accessLevel: 'read_only',
          addedById: session.userId,
          addedVia: 'request',
        },
      });

      // Notify the new team member
      if (teamRequest.requestedUserId !== session.userId) {
        await notifyUser(
          teamRequest.requestedUserId,
          'wo_team_approved',
          'Team Assignment Approved',
          `You have been added to WO ${wo.woNumber || 'Work Order'}: ${wo.title}`,
          'work_order',
          id,
          `/maintenance?tab=work-orders&view=${id}`,
        );
      }
    }

    // Update the request
    const updated = await db.woTeamMemberRequest.update({
      where: { id: reqId },
      data: {
        status: newStatus,
        reviewedBy: session.userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
      include: {
        requestedByUser: { select: { id: true, fullName: true, username: true } },
        requestedUser: { select: { id: true, fullName: true, username: true, department: true } },
        reviewedByUser: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Notify the requester about the decision
    if (teamRequest.requestedBy !== session.userId) {
      const notificationType = action === 'approve' ? 'wo_team_request_approved' : 'wo_team_request_rejected';
      const notificationTitle = action === 'approve' ? 'Team Request Approved' : 'Team Request Rejected';
      const notificationMsg = action === 'approve'
        ? `Your request to add ${teamRequest.requestedUser.fullName} to WO ${wo.woNumber || 'Work Order'} has been approved.`
        : `Your request to add ${teamRequest.requestedUser.fullName} to WO ${wo.woNumber || 'Work Order'} has been rejected.${reviewNotes ? ` Reason: ${reviewNotes}` : ''}`;

      await notifyUser(
        teamRequest.requestedBy,
        notificationType,
        notificationTitle,
        notificationMsg,
        'work_order',
        id,
        `/maintenance?tab=work-orders&view=${id}`,
      );
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: action === 'approve' ? 'approve' : 'reject',
        entityType: 'wo_team_member_request',
        entityId: reqId,
        newValues: JSON.stringify({
          workOrderId: id,
          requestedUser: teamRequest.requestedUser.fullName,
          status: newStatus,
          reviewNotes: reviewNotes || null,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to review team member request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/work-orders/[id]/team-member-requests/[reqId]
 * Cancel a pending team member request (only the requester can cancel their own)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id, reqId } = await params;

    const teamRequest = await db.woTeamMemberRequest.findUnique({
      where: { id: reqId },
    });
    if (!teamRequest) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    if (teamRequest.workOrderId !== id) {
      return NextResponse.json({ success: false, error: 'Request does not belong to this work order' }, { status: 400 });
    }

    // Only the requester can cancel, or admin/planner
    const canCancel = isAdmin(session) ||
      hasAnyPermission(session, ['work_orders.assign', 'work_orders.*']) ||
      teamRequest.requestedBy === session.userId;

    if (!canCancel) {
      return NextResponse.json({ success: false, error: 'You can only cancel your own requests' }, { status: 403 });
    }

    if (teamRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot cancel a ${teamRequest.status} request` },
        { status: 400 }
      );
    }

    await db.woTeamMemberRequest.update({
      where: { id: reqId },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true, data: { id: reqId } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel team member request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

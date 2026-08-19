import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';

/**
 * PUT /api/work-orders/[id]/team-member-requests/[reqId]
 * Approve or reject a team member request.
 * - Only the assigner, admin, or users with work_orders.assign permission can review
 * - Trade-based requests: on approve, the planner selects which technician to assign
 * - User-based requests: on approve, automatically adds the specified team member to the WO
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
    const auth = await authorizeWorkOrderPlant(request, session, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action, reviewNotes, assignUserId } = body; // action: "approve" | "reject", assignUserId: technician to assign when approving trade request

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
        plannerId: true,
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

    // Permission check: only planner, assigner, admin, or users with assign permission can review
    const canReview = isAdmin(session) ||
      hasAnyPermission(session, ['work_orders.assign_supervisor']) ||
      wo.plannerId === session.userId ||
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
        requestedUser: { select: { id: true, fullName: true, username: true, department: true, primaryTrade: true } },
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
      // Determine which user to assign
      let userIdToAssign = teamRequest.requestedUserId; // from user-based request

      // Trade-based request: planner must specify which technician to assign
      if (!userIdToAssign && teamRequest.requestedTrade) {
        if (!assignUserId) {
          return NextResponse.json(
            { success: false, error: 'Please select a technician to assign for this trade request.' },
            { status: 400 }
          );
        }
        userIdToAssign = assignUserId;
      }

      if (!userIdToAssign) {
        return NextResponse.json(
          { success: false, error: 'No user to assign. Either the request must specify a user, or you must select one.' },
          { status: 400 }
        );
      }

      // Verify the assignee exists and is active
      const assignee = await db.user.findUnique({
        where: { id: userIdToAssign },
        select: { id: true, fullName: true, status: true },
      });
      if (!assignee) {
        return NextResponse.json({ success: false, error: 'Selected technician not found.' }, { status: 400 });
      }
      if (assignee.status !== 'active') {
        return NextResponse.json({ success: false, error: 'Selected technician is not active.' }, { status: 400 });
      }

      // Check not already a team member (could have been added since request was created)
      const alreadyMember = wo.teamMembers?.some(tm => tm.userId === userIdToAssign);
      if (alreadyMember) {
        // Still mark as approved but don't create duplicate
        await db.woTeamMemberRequest.update({
          where: { id: reqId },
          data: {
            status: 'approved',
            requestedUserId: userIdToAssign, // record who was actually assigned
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
          userId: userIdToAssign,
          role: teamRequest.role,
          accessLevel: 'read_only',
          addedById: session.userId,
          addedVia: 'request',
        },
      });

      // Update the request with the assigned user
      await db.woTeamMemberRequest.update({
        where: { id: reqId },
        data: {
          status: 'approved',
          requestedUserId: userIdToAssign, // record who was actually assigned (important for trade-based)
          reviewedBy: session.userId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
        },
      });

      // Notify the new team member
      if (userIdToAssign !== session.userId) {
        await notifyUser(
          userIdToAssign,
          'wo_team_approved',
          'Team Assignment Approved',
          `You have been added to WO ${wo.woNumber || 'Work Order'}: ${wo.title}`,
          'work_order',
          id,
          `wo-detail?id=${id}`,
        );
      }

      // Notify the requester
      if (teamRequest.requestedBy !== session.userId) {
        const assignedName = assignee?.fullName || 'a technician';
        await notifyUser(
          teamRequest.requestedBy,
          'wo_team_request_approved',
          'Team Request Approved',
          `Your request for ${teamRequest.requestedTrade || 'a team member'} on WO ${wo.woNumber || 'Work Order'} has been approved. ${assignedName} has been assigned.`,
          'work_order',
          id,
          `wo-detail?id=${id}`,
        );
      }

      // Audit log
      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'approve',
          entityType: 'wo_team_member_request',
          entityId: reqId,
          newValues: JSON.stringify({
            workOrderId: id,
            requestedTrade: teamRequest.requestedTrade || null,
            assignedUser: assignee?.fullName || null,
            assignedUserId: userIdToAssign,
            status: 'approved',
            reviewNotes: reviewNotes || null,
          }),
        },
      });

      // Fetch the updated request for response
      const updated = await db.woTeamMemberRequest.findUnique({
        where: { id: reqId },
        include: {
          requestedByUser: { select: { id: true, fullName: true, username: true } },
          requestedUser: { select: { id: true, fullName: true, username: true, department: true, primaryTrade: true } },
          reviewedByUser: { select: { id: true, fullName: true, username: true } },
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // ---- REJECT ----
    await db.woTeamMemberRequest.update({
      where: { id: reqId },
      data: {
        status: 'rejected',
        reviewedBy: session.userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });

    // Notify the requester about the rejection
    if (teamRequest.requestedBy !== session.userId) {
      const targetDesc = teamRequest.requestedTrade || teamRequest.requestedUser?.fullName || 'a team member';
      await notifyUser(
        teamRequest.requestedBy,
        'wo_team_request_rejected',
        'Team Request Rejected',
        `Your request for ${targetDesc} on WO ${wo.woNumber || 'Work Order'} has been rejected.${reviewNotes ? ` Reason: ${reviewNotes}` : ''}`,
        'work_order',
        id,
        `wo-detail?id=${id}`,
      );
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'reject',
        entityType: 'wo_team_member_request',
        entityId: reqId,
        newValues: JSON.stringify({
          workOrderId: id,
          requestedTrade: teamRequest.requestedTrade || null,
          requestedUser: teamRequest.requestedUser?.fullName || null,
          status: 'rejected',
          reviewNotes: reviewNotes || null,
        }),
      },
    });

    // Fetch the updated request for response
    const updated = await db.woTeamMemberRequest.findUnique({
      where: { id: reqId },
      include: {
        requestedByUser: { select: { id: true, fullName: true, username: true } },
        requestedUser: { select: { id: true, fullName: true, username: true, department: true, primaryTrade: true } },
        reviewedByUser: { select: { id: true, fullName: true, username: true } },
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
    const auth = await authorizeWorkOrderPlant(request, session, id);
    if (!auth.ok) return auth.response;

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
      hasAnyPermission(session, ['work_orders.assign_supervisor']) ||
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

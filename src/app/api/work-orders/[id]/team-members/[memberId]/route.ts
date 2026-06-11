import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';

/**
 * DELETE /api/work-orders/[id]/team-members/[memberId]
 * Remove a team member from a work order.
 *
 * PERMISSION RULES:
 * - Admin: Always allowed
 * - Users with work_orders.assign / work_orders.*: Allowed
 * - The person who assigned the WO (wo.assignedBy): Allowed
 * - Technicians / regular team members: BLOCKED
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id, memberId } = await params;

    // Validate WO exists
    const wo = await db.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        assignedBy: true,
        isLocked: true,
      },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is permanently locked. No modifications are allowed after planner closure.' }, { status: 400 });
    }

    // ─── PERMISSION CHECK ────────────────────────────────────────────────
    const canDirectRemove = isAdmin(session) ||
      hasAnyPermission(session, ['work_orders.assign_supervisor']) ||
      wo.assignedBy === session.userId;

    if (!canDirectRemove) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to remove team members. Contact the person who assigned this work order.',
          code: 'USE_REQUEST_FLOW',
        },
        { status: 403 }
      );
    }
    // ─── END PERMISSION CHECK ────────────────────────────────────────────

    // Validate member belongs to the WO
    const member = await db.workOrderTeamMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { id: true, fullName: true, username: true } } },
    });
    if (!member) {
      return NextResponse.json({ success: false, error: 'Team member not found' }, { status: 404 });
    }

    if (member.workOrderId !== id) {
      return NextResponse.json(
        { success: false, error: 'Team member does not belong to this work order' },
        { status: 400 }
      );
    }

    await db.workOrderTeamMember.delete({
      where: { id: memberId },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'wo_team_member',
        entityId: memberId,
        oldValues: JSON.stringify({
          workOrderId: id,
          userId: member.user.fullName,
          role: member.role,
        }),
      },
    });

    return NextResponse.json({ success: true, data: { id: memberId } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove team member';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

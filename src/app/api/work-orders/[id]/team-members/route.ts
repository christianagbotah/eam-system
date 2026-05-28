import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';

/**
 * POST /api/work-orders/[id]/team-members
 * Directly add a team member to a work order.
 *
 * PERMISSION RULES:
 * - Admin: Always allowed
 * - Users with work_orders.assign / work_orders.*: Allowed
 * - The person who assigned the WO (wo.assignedBy): Allowed
 * - Technicians / regular team members: BLOCKED — must use /team-member-requests instead
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
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Fetch WO with assigner info for permission check
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
    // Only admins, users with assign permission, or the original assigner can directly add
    const canDirectAdd = isAdmin(session) ||
      hasAnyPermission(session, ['work_orders.assign', 'work_orders.*']) ||
      wo.assignedBy === session.userId;

    if (!canDirectAdd) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to directly add team members. Please submit a team member request instead.',
          code: 'USE_REQUEST_FLOW',
        },
        { status: 403 }
      );
    }
    // ─── END PERMISSION CHECK ────────────────────────────────────────────

    // Verify the user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, username: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 400 });
    }

    // Prevent duplicates (same user on same WO)
    const existingMember = await db.workOrderTeamMember.findFirst({
      where: { workOrderId: id, userId },
    });
    if (existingMember) {
      return NextResponse.json(
        { success: false, error: 'User is already a team member of this work order' },
        { status: 409 }
      );
    }

    const member = await db.workOrderTeamMember.create({
      data: {
        workOrderId: id,
        userId,
        role: role || 'assistant',
        addedById: session.userId,
        addedVia: 'direct',
      },
      include: {
        user: { select: { id: true, fullName: true, username: true, department: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'wo_team_member',
        entityId: member.id,
        newValues: JSON.stringify({
          workOrderId: id,
          userId: user.fullName,
          role: role || 'assistant',
          addedVia: 'direct',
        }),
      },
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add team member';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked && !session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Work order is locked' }, { status: 400 });
    }

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
        }),
      },
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add team member';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['work_orders.assign', 'work_orders.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id, memberId } = await params;

    // Validate WO exists
    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked && !session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Work order is locked' }, { status: 400 });
    }

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

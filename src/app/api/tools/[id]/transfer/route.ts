import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'tools.transfer') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { toUserId, notes } = body;

    if (!toUserId) {
      return NextResponse.json({ success: false, error: 'toUserId is required' }, { status: 400 });
    }

    const tool = await db.tool.findUnique({ where: { id } });
    if (!tool) {
      return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });
    }

    if (!tool.assignedToId) {
      return NextResponse.json({ success: false, error: 'Tool is not currently assigned to anyone' }, { status: 400 });
    }

    if (tool.assignedToId === toUserId) {
      return NextResponse.json({ success: false, error: 'Cannot transfer tool to the same user' }, { status: 400 });
    }

    // Validate target user exists
    const targetUser = await db.user.findUnique({ where: { id: toUserId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 400 });
    }

    const previousAssigneeId = tool.assignedToId;

    const updated = await db.tool.update({
      where: { id },
      data: {
        status: 'transferred',
        assignedToId: toUserId,
        checkedOutAt: new Date(),
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, username: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create transaction record
    await db.toolTransaction.create({
      data: {
        toolId: id,
        type: 'transfer',
        fromUserId: previousAssigneeId,
        toUserId,
        notes: notes || null,
        performedById: session.userId,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'tool',
        entityId: id,
        oldValues: JSON.stringify({ assignedToId: previousAssigneeId }),
        newValues: JSON.stringify({ status: 'transferred', assignedToId: toUserId }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to transfer tool';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

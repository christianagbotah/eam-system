import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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
    const { assignedToId, expectedReturn } = body;

    if (!assignedToId) {
      return NextResponse.json({ success: false, error: 'assignedToId is required' }, { status: 400 });
    }

    const tool = await db.tool.findUnique({ where: { id } });
    if (!tool) {
      return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });
    }

    if (tool.status !== 'available') {
      return NextResponse.json({ success: false, error: `Tool is currently ${tool.status}, cannot check out` }, { status: 400 });
    }

    // Validate user exists
    const targetUser = await db.user.findUnique({ where: { id: assignedToId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 400 });
    }

    const updated = await db.tool.update({
      where: { id },
      data: {
        status: 'checked_out',
        assignedToId,
        checkedOutAt: new Date(),
        expectedReturn: expectedReturn ? new Date(expectedReturn) : null,
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
        type: 'checkout',
        toUserId: assignedToId,
        notes: body.notes || null,
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
        oldValues: JSON.stringify({ status: tool.status }),
        newValues: JSON.stringify({ status: 'checked_out', assignedToId }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check out tool';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

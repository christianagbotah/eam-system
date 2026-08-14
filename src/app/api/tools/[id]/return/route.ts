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
    if (!hasPermission(session, 'tools.return') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    const tool = await db.tool.findUnique({ where: { id } });
    if (!tool) {
      return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });
    }

    if (tool.status !== 'checked_out') {
      return NextResponse.json({ success: false, error: `Tool is currently ${tool.status}, cannot return` }, { status: 400 });
    }

    const previousAssigneeId = tool.assignedToId;
    const previousStatus = tool.status;

    // Wrap tool update + transaction record + audit log in a single transaction
    const updated = await db.$transaction(async (tx) => {
      const updatedTool = await tx.tool.update({
        where: { id },
        data: {
          status: 'available',
          assignedToId: null,
          checkedOutAt: null,
          expectedReturn: null,
        },
        include: {
          assignedTo: { select: { id: true, fullName: true, username: true } },
          createdBy: { select: { id: true, fullName: true, username: true } },
        },
      });

      // Create transaction record
      await tx.toolTransaction.create({
        data: {
          toolId: id,
          type: 'return',
          fromUserId: previousAssigneeId,
          notes: notes || null,
          performedById: session.userId,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'update',
          entityType: 'tool',
          entityId: id,
          oldValues: JSON.stringify({ status: previousStatus, assignedToId: previousAssigneeId }),
          newValues: JSON.stringify({ status: 'available', assignedToId: null }),
        },
      });

      return updatedTool;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to return tool';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

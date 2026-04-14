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
    if (!hasPermission(session, 'tools.repair') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    const tool = await db.tool.findUnique({ where: { id } });
    if (!tool) {
      return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });
    }

    if (tool.status === 'in_repair') {
      return NextResponse.json({ success: false, error: 'Tool is already in repair' }, { status: 400 });
    }

    const previousStatus = tool.status;

    // If the tool was checked out, clear assignment
    const updateData: Record<string, unknown> = {
      status: 'in_repair',
    };
    if (tool.assignedToId) {
      updateData.assignedToId = null;
      updateData.checkedOutAt = null;
      updateData.expectedReturn = null;
    }

    const updated = await db.tool.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, fullName: true, username: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create transaction record
    await db.toolTransaction.create({
      data: {
        toolId: id,
        type: 'repair_start',
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
        oldValues: JSON.stringify({ status: previousStatus }),
        newValues: JSON.stringify({ status: 'in_repair' }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send tool for repair';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

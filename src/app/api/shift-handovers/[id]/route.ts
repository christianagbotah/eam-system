import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const handover = await db.shiftHandover.findUnique({
      where: { id },
      include: {
        handedOverBy: { select: { id: true, fullName: true, username: true } },
        receivedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!handover) {
      return NextResponse.json({ success: false, error: 'Shift handover not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: handover });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load shift handover';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'operations.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.shiftHandover.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Shift handover not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['shiftType', 'shiftDate', 'fromShift', 'toShift', 'receivedById', 'tasksSummary', 'pendingIssues', 'safetyNotes', 'equipmentStatus', 'notes', 'status'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'shiftDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (field === 'tasksSummary' || field === 'pendingIssues' || field === 'equipmentStatus') {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.shiftHandover.update({
      where: { id },
      data: updateData,
      include: {
        handedOverBy: { select: { id: true, fullName: true, username: true } },
        receivedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'shift_handover',
        entityId: id,
        oldValues: JSON.stringify({ shiftType: existing.shiftType, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update shift handover';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.shiftHandover.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Shift handover not found' }, { status: 404 });
    }

    await db.shiftHandover.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'shift_handover',
        entityId: id,
        oldValues: JSON.stringify({ shiftType: existing.shiftType }),
      },
    });

    return NextResponse.json({ success: true, message: 'Shift handover deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete shift handover';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

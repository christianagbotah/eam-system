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

    const checklist = await db.checklist.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ success: false, error: 'Checklist not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: checklist });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load checklist';
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

    const existing = await db.checklist.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Checklist not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['title', 'description', 'type', 'frequency', 'departmentId', 'assetId', 'isActive'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await db.checklist.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'checklist',
        entityId: id,
        oldValues: JSON.stringify({ title: existing.title, isActive: existing.isActive }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update checklist';
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

    const existing = await db.checklist.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Checklist not found' }, { status: 404 });
    }

    // Delete items first (cascade), then the checklist
    await db.checklistItem.deleteMany({ where: { checklistId: id } });
    await db.checklist.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'checklist',
        entityId: id,
        oldValues: JSON.stringify({ title: existing.title }),
      },
    });

    return NextResponse.json({ success: true, message: 'Checklist deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete checklist';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

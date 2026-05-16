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

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const annotation = await db.twinAnnotation.findUnique({
      where: { id },
      include: {
        scene: true,
        author: { select: { id: true, fullName: true, username: true, avatar: true } },
        asset: true,
      },
    });

    if (!annotation) {
      return NextResponse.json({ success: false, error: 'Annotation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: annotation });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load twin annotation';
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

    if (!hasPermission(session, 'digital_twin.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.twinAnnotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Twin annotation not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['content', 'position', 'type', 'priority'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'position') {
          updateData[field] = body[field] !== null ? JSON.stringify(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.twinAnnotation.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, fullName: true, username: true, avatar: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'twin_annotation',
        entityId: id,
        oldValues: JSON.stringify({ content: existing.content, type: existing.type }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update twin annotation';
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

    if (!hasPermission(session, 'digital_twin.delete') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.twinAnnotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Twin annotation not found' }, { status: 404 });
    }

    await db.twinAnnotation.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'twin_annotation',
        entityId: id,
        oldValues: JSON.stringify({ content: existing.content, sceneId: existing.sceneId, authorId: existing.authorId }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete twin annotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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

    const diagram = await db.systemDiagram.findUnique({
      where: { id },
      include: {
        createdByIdUser: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!diagram) {
      return NextResponse.json({ success: false, error: 'System diagram not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: diagram });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load system diagram';
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

    const existing = await db.systemDiagram.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'System diagram not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['name', 'description', 'type', 'nodes', 'edges', 'viewport', 'plantId'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'nodes' || field === 'edges' || field === 'viewport') {
          updateData[field] = body[field] !== null ? JSON.stringify(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.systemDiagram.update({
      where: { id },
      data: updateData,
      include: {
        createdByIdUser: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Increment version on update
    await db.systemDiagram.update({
      where: { id },
      data: { version: { increment: 1 } },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'system_diagram',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, type: existing.type, version: existing.version }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: { ...updated, version: (updated.version || 0) + 1 } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update system diagram';
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

    const existing = await db.systemDiagram.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'System diagram not found' }, { status: 404 });
    }

    await db.systemDiagram.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'system_diagram',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, type: existing.type }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete system diagram';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const node = await db.spatialNode.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
            _count: {
              select: { children: true, assets: true },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        assets: {
          select: { id: true, name: true, assetTag: true, status: true, criticality: true },
        },
        _count: {
          select: { children: true, assets: true },
        },
      },
    });

    if (!node) {
      return NextResponse.json({ success: false, error: 'Spatial node not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: node });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load spatial node';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.spatialNode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Spatial node not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'code', 'nodeType', 'coordinates', 'floorMapUrl',
      'capacity', 'metadata', 'isActive', 'parentId', 'sortOrder',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (['coordinates', 'metadata'].includes(field)) {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else if (['capacity', 'sortOrder'].includes(field) && body[field] !== null) {
          updateData[field] = parseInt(String(body[field]), 10);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Validate parentId if changing
    if (updateData.parentId && updateData.parentId !== existing.parentId) {
      if (updateData.parentId === existing.id) {
        return NextResponse.json({ success: false, error: 'Node cannot be its own parent' }, { status: 400 });
      }
      const parent = await db.spatialNode.findUnique({ where: { id: updateData.parentId as string } });
      if (!parent) {
        return NextResponse.json({ success: false, error: 'Parent spatial node not found' }, { status: 404 });
      }
    }

    const updated = await db.spatialNode.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: {
          select: { children: true, assets: true },
        },
      },
    });

    await createAuditLog(
      session.userId,
      'spatial_node',
      'update',
      id,
      {
        oldValues: { name: existing.name, nodeType: existing.nodeType },
        newValues: updateData,
      },
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update spatial node';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.delete') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.spatialNode.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Spatial node not found' }, { status: 404 });
    }

    // Collect all descendant IDs for cascade deletion
    const getAllDescendantIds = async (pid: string): Promise<string[]> => {
      const children = await db.spatialNode.findMany({ where: { parentId: pid }, select: { id: true } });
      const ids: string[] = [];
      for (const child of children) {
        ids.push(child.id);
        const childIds = await getAllDescendantIds(child.id);
        ids.push(...childIds);
      }
      return ids;
    };

    const descendantIds = await getAllDescendantIds(id);
    const allIds = [id, ...descendantIds];

    await db.spatialNode.deleteMany({
      where: { id: { in: allIds } },
    });

    await createAuditLog(
      session.userId,
      'spatial_node',
      'delete',
      id,
      {
        oldValues: { name: existing.name, nodeType: existing.nodeType },
        newValues: { deleted: true, cascadeCount: descendantIds.length },
      },
    );

    return NextResponse.json({ success: true, data: { deleted: true, cascadeDeleted: descendantIds.length } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete spatial node';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

const VALID_NODE_TYPES = ['plant', 'building', 'floor', 'area', 'production_line', 'machine', 'component'];

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const nodeType = searchParams.get('nodeType');
    const search = searchParams.get('search');
    const plantId = searchParams.get('plantId');

    const where: Record<string, unknown> = {};

    // Shortcut: get full tree for a plant
    if (plantId) {
      const plant = await db.spatialNode.findUnique({ where: { id: plantId } });
      if (!plant) {
        return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
      }

      // Get all descendant node IDs recursively
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

      const descendantIds = await getAllDescendantIds(plantId);
      const allIds = [plantId, ...descendantIds];

      const nodes = await db.spatialNode.findMany({
        where: { id: { in: allIds } },
        include: {
          parent: { select: { id: true, name: true, code: true } },
          _count: {
            select: { children: true, assets: true },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return NextResponse.json({ success: true, data: nodes, pagination: { total: nodes.length } });
    }

    if (parentId === 'null' || parentId === '') {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }

    if (nodeType) {
      where.nodeType = nodeType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    const nodes = await db.spatialNode.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: {
          select: { children: true, assets: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: nodes, pagination: { total: nodes.length } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load spatial nodes';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, nodeType, parentId, coordinates, floorMapUrl, capacity, metadata, isActive, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    }

    if (!nodeType) {
      return NextResponse.json({ success: false, error: 'nodeType is required' }, { status: 400 });
    }

    if (!VALID_NODE_TYPES.includes(nodeType)) {
      return NextResponse.json(
        { success: false, error: `nodeType must be one of: ${VALID_NODE_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (parentId) {
      const parent = await db.spatialNode.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ success: false, error: 'Parent spatial node not found' }, { status: 404 });
      }
    }

    const node = await db.spatialNode.create({
      data: {
        name,
        code: code || null,
        nodeType,
        parentId: parentId || null,
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
        floorMapUrl: floorMapUrl || null,
        capacity: capacity !== undefined ? parseInt(String(capacity), 10) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0,
      },
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
      'create',
      node.id,
      { newValues: { name, code, nodeType, parentId } },
    );

    return NextResponse.json({ success: true, data: node }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create spatial node';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const [diagrams, total] = await Promise.all([
      db.systemDiagram.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          createdByIdUser: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.systemDiagram.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: diagrams,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load system diagrams';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      nodes,
      edges,
      viewport,
      plantId,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Diagram name is required' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ success: false, error: 'Diagram type is required' }, { status: 400 });
    }

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ success: false, error: 'Nodes array is required' }, { status: 400 });
    }

    if (!edges || !Array.isArray(edges)) {
      return NextResponse.json({ success: false, error: 'Edges array is required' }, { status: 400 });
    }

    const diagram = await db.systemDiagram.create({
      data: {
        name,
        description: description || null,
        type,
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
        viewport: viewport ? JSON.stringify(viewport) : null,
        plantId: plantId || null,
        createdById: session.userId,
      },
      include: {
        createdByIdUser: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'system_diagram',
        entityId: diagram.id,
        newValues: JSON.stringify({ name, type, nodeCount: nodes.length, edgeCount: edges.length }),
      },
    });

    return NextResponse.json({ success: true, data: diagram }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create system diagram';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

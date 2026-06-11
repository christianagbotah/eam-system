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
    const type = searchParams.get('type') || searchParams.get('diagramType');
    let page = parseInt(searchParams.get('page') || '1', 10);
    let limit = parseInt(searchParams.get('limit') || '20', 10);
    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.min(100, Math.max(1, isNaN(limit) ? 20 : limit));

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
    console.error('[API /api/system-diagrams GET]', message, error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const {
      name,
      description,
      type: bodyType,
      diagramType,
      nodes,
      edges,
      viewport,
      plantId,
      isTemplate: bodyIsTemplate,
    } = body;
    const type = bodyType || diagramType;
    const isTemplate = bodyIsTemplate || false;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Diagram name is required' }, { status: 400 });
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json({ success: false, error: 'Diagram type is required' }, { status: 400 });
    }

    if (typeof isTemplate !== 'boolean') {
      return NextResponse.json({ success: false, error: 'isTemplate must be a boolean' }, { status: 400 });
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
        description: typeof description === 'string' ? description : null,
        type,
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
        viewport: viewport ? JSON.stringify(viewport) : null,
        plantId: typeof plantId === 'string' ? plantId : null,
        isTemplate,
        createdById: session.userId,
      },
      include: {
        createdByIdUser: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!diagram) {
      console.error('[API /api/system-diagrams POST] db.systemDiagram.create returned null');
      return NextResponse.json({ success: false, error: 'Failed to create diagram — database may be unavailable' }, { status: 500 });
    }

    // Audit log — fire-and-forget, don't fail the main operation
    db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'system_diagram',
        entityId: diagram.id,
        newValues: JSON.stringify({ name, type, nodeCount: nodes.length, edgeCount: edges.length }),
      },
    }).catch((auditErr: unknown) => {
      console.warn('[API /api/system-diagrams POST] Audit log write failed:', auditErr);
    });

    return NextResponse.json({ success: true, data: diagram }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create system diagram';
    console.error('[API /api/system-diagrams POST]', message, error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

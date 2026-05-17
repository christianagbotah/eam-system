import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

// GET /api/system-diagrams/[id]/export — export diagram as JSON
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
    const diagram = await db.systemDiagram.findUnique({ where: { id } });
    if (!diagram) {
      return NextResponse.json({ success: false, error: 'Diagram not found' }, { status: 404 });
    }

    const exportData = {
      name: diagram.name,
      description: diagram.description,
      type: diagram.type,
      nodes: JSON.parse(diagram.nodes || '[]'),
      edges: JSON.parse(diagram.edges || '[]'),
      viewport: diagram.viewport ? JSON.parse(diagram.viewport) : null,
      version: diagram.version,
      exportedAt: new Date().toISOString(),
      exportedBy: session.userId,
      source: 'iAssetsPro',
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${diagram.name.replace(/[^a-zA-Z0-9]/g, '_')}.json"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export diagram';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

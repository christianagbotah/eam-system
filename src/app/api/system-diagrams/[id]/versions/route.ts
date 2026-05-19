import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

// GET /api/system-diagrams/[id]/versions — list version history
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

    // Get audit log entries for this diagram to build version history
    const history = await db.auditLog.findMany({
      where: {
        entityType: 'system_diagram',
        entityId: id,
        action: { in: ['create', 'update'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, fullName: true, username: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        currentVersion: diagram.version,
        history: history.map(h => ({
          version: h.action === 'create' ? 1 : null,
          action: h.action,
          userId: h.userId,
          user: h.user,
          details: h.newValues ? JSON.parse(h.newValues) : null,
          createdAt: h.createdAt,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load version history';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

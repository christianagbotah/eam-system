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
    const sceneId = searchParams.get('sceneId');
    const type = searchParams.get('type');

    if (!sceneId) {
      return NextResponse.json({ success: false, error: 'sceneId query parameter is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { sceneId };

    if (type) {
      where.type = type;
    }

    const annotations = await db.twinAnnotation.findMany({
      where,
      include: {
        author: { select: { id: true, fullName: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: annotations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load twin annotations';
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
      sceneId,
      title,
      content,
      position,
      type,
      priority,
    } = body;

    if (!sceneId) {
      return NextResponse.json({ success: false, error: 'Scene ID is required' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ success: false, error: 'Annotation title is required' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ success: false, error: 'Annotation content is required' }, { status: 400 });
    }

    // Verify scene exists
    const scene = await db.digitalTwinScene.findUnique({ where: { id: sceneId } });
    if (!scene) {
      return NextResponse.json({ success: false, error: 'Scene not found' }, { status: 404 });
    }

    const annotation = await db.twinAnnotation.create({
      data: {
        sceneId,
        title,
        content,
        position: position ? JSON.stringify(position) : null,
        authorId: session.userId,
        type: type || 'note',
        priority: priority || 'low',
      },
      include: {
        author: { select: { id: true, fullName: true, username: true, avatar: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'twin_annotation',
        entityId: annotation.id,
        newValues: JSON.stringify({ sceneId, title, type: type || 'note', priority: priority || 'low' }),
      },
    });

    return NextResponse.json({ success: true, data: annotation }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create twin annotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

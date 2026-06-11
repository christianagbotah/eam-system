import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { TwinCollaborationService } from '@/services/twinCollaboration.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const twinId = searchParams.get('twinId');
    if (!twinId) return NextResponse.json({ success: false, error: 'twinId required' }, { status: 400 });

    const sessions = await TwinCollaborationService.listSessions(twinId);
    return NextResponse.json({ success: true, data: sessions });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to list sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, twinId, name, sessionId, userId, userName } = body;

    if (action === 'create') {
      const result = await TwinCollaborationService.createSession(twinId, name, userId || session.userId, userName || session.username || 'User');
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'join') {
      const result = await TwinCollaborationService.joinSession(sessionId, userId || session.userId, userName || session.username || 'User');
      if (!result) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'leave') {
      await TwinCollaborationService.leaveSession(sessionId, userId || session.userId);
      return NextResponse.json({ success: true });
    }

    if (action === 'annotate') {
      const annotation = await TwinCollaborationService.addAnnotation(sessionId, userId || session.userId, body.annotation);
      return NextResponse.json({ success: true, data: annotation });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Collaboration operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

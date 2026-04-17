import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, deleteSession, sessionCache } from '@/lib/auth';

// GET: List active sessions for the current user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Find session by token to get userId
    const currentSession = await db.session.findUnique({
      where: { token },
    });

    if (!currentSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 401 });
    }

    // Check expiry
    if (new Date(currentSession.expiresAt) < new Date()) {
      await db.session.delete({ where: { id: currentSession.id } }).catch(() => {});
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    }

    // Fetch all active sessions for this user
    const sessions = await db.session.findMany({
      where: {
        userId: currentSession.userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastSeen: 'desc' },
    });

    const sessionsData = sessions.map(s => ({
      id: s.id,
      token: s.token.slice(0, 8) + '••••••••' + s.token.slice(-4),
      isCurrent: s.token === token,
      createdAt: s.createdAt,
      lastSeen: s.lastSeen,
      expiresAt: s.expiresAt,
    }));

    return NextResponse.json({
      success: true,
      data: sessionsData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sessions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE: Delete sessions
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const currentSession = await db.session.findUnique({
      where: { token },
    });

    if (!currentSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 401 });
    }

    if (new Date(currentSession.expiresAt) < new Date()) {
      await db.session.delete({ where: { id: currentSession.id } }).catch(() => {});
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    if (body.all === true) {
      // Delete all sessions except current
      const result = await db.session.deleteMany({
        where: {
          userId: currentSession.userId,
          id: { not: currentSession.id },
          expiresAt: { gt: new Date() },
        },
      });

      // Clear deleted sessions from cache
      const remaining = await db.session.findMany({
        where: { userId: currentSession.userId },
        select: { token: true },
      });
      const remainingTokens = new Set(remaining.map(s => s.token));
      for (const [cacheKey] of sessionCache.entries()) {
        if (cacheKey !== token && !remainingTokens.has(cacheKey)) {
          sessionCache.delete(cacheKey);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Revoked ${result.count} other session(s)`,
        data: { revokedCount: result.count },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Provide { all: true } or use /api/sessions/[id] to delete a specific session' },
      { status: 400 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete sessions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

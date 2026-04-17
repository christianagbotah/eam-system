import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionCache } from '@/lib/auth';

// DELETE: Delete a specific session by ID (must belong to the current user)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Find current session to get userId
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

    // Find the target session
    const targetSession = await db.session.findUnique({
      where: { id },
    });

    if (!targetSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Verify the session belongs to the current user
    if (targetSession.userId !== currentSession.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Prevent deleting the current session through this endpoint
    if (targetSession.token === token) {
      return NextResponse.json(
        { success: false, error: 'Cannot revoke your current session through this endpoint. Use logout instead.' },
        { status: 400 },
      );
    }

    // Delete the session
    await db.session.delete({ where: { id } });

    // Remove from cache
    sessionCache.delete(targetSession.token);

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to revoke session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { authorizeMaintenanceRequestPlant } from '@/lib/plant-auth-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const auth = await authorizeMaintenanceRequestPlant(request, session, id);
    if (!auth.ok) return auth.response;

    if (!hasAnyPermission(session, ['maintenance_requests.view'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const mr = await db.maintenanceRequest.findUnique({ where: { id } });
    if (!mr) {
      return NextResponse.json({ success: false, error: 'Maintenance request not found' }, { status: 404 });
    }

    const comment = await db.maintenanceRequestComment.create({
      data: {
        maintenanceRequestId: id,
        userId: session.userId,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Notify the requester if commenter is not the requester
    if (mr.requestedBy && mr.requestedBy !== session.userId) {
      await notifyUser(
        mr.requestedBy,
        'mr_comment',
        'New Comment on MR',
        `${session.fullName} commented on ${mr.requestNumber}: "${content.trim().substring(0, 80)}${content.trim().length > 80 ? '...' : ''}"`,
        'maintenance_request',
        id,
        `mr-detail?id=${id}`,
      );
    }

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add comment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

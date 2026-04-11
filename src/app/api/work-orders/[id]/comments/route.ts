import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

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
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const comment = await db.workOrderComment.create({
      data: {
        workOrderId: id,
        userId: session.userId,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Notify WO planner/creator if commenter is different
    if (wo.plannerId && wo.plannerId !== session.userId) {
      await notifyUser(
        wo.plannerId,
        'wo_comment',
        'New Comment on WO',
        `New comment on ${wo.woNumber}`,
        'work_order',
        id,
        `wo-detail?id=${id}`,
      );
    }

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add comment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

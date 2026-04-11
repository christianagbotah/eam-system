import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/chat/conversations/[id]/read — mark messages as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await db.conversationParticipant.update({
      where: { userId_convoId: { userId: session.userId, convoId: id } },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Chat] POST read error:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}

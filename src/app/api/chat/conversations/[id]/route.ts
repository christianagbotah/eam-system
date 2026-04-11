import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/chat/conversations/[id] — get conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const convo = await db.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: { id: true, fullName: true, username: true } } },
        },
      },
    });

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify participant
    const isParticipant = convo.participants.some(p => p.userId === session.userId);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    return NextResponse.json({
      data: {
        id: convo.id,
        name: convo.name,
        type: convo.type,
        createdAt: convo.createdAt.toISOString(),
        participants: convo.participants.map(p => ({
          userId: p.userId,
          name: p.user.fullName,
          username: p.user.username,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Chat] GET conversation error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

// DELETE /api/chat/conversations/[id] — leave/delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    // Remove user from conversation
    await db.conversationParticipant.delete({
      where: { userId_convoId: { userId: session.userId, convoId: id } },
    });

    // If no participants left, delete the conversation
    const remaining = await db.conversationParticipant.count({
      where: { convoId: id },
    });
    if (remaining === 0) {
      await db.conversation.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Chat] DELETE conversation error:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}

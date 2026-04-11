import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/chat/conversations/[id]/messages — get messages with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    // Verify user is a participant
    const participant = await db.conversationParticipant.findUnique({
      where: { userId_convoId: { userId: session.userId, convoId: id } },
    });
    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor');

    const messages = await db.chatMessage.findMany({
      where: { convoId: id, messageType: 'text' },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      include: {
        sender: { select: { id: true, fullName: true } },
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Return in chronological order (oldest first)
    messages.reverse();

    return NextResponse.json({
      data: {
        messages: messages.map(m => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId,
          senderName: m.sender.fullName,
          messageType: m.messageType,
          createdAt: m.createdAt.toISOString(),
        })),
        hasMore,
      },
    });
  } catch (error: any) {
    console.error('[Chat] GET messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/chat/conversations/[id]/messages — send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { content, messageType = 'text' } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Verify participant
    const participant = await db.conversationParticipant.findUnique({
      where: { userId_convoId: { userId: session.userId, convoId: id } },
    });
    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const message = await db.chatMessage.create({
      data: {
        convoId: id,
        senderId: session.userId,
        content: content.trim(),
        messageType,
      },
      include: {
        sender: { select: { id: true, fullName: true } },
      },
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      data: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: message.sender.fullName,
        messageType: message.messageType,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Chat] POST message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

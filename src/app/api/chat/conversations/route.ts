import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/chat/conversations — list user's conversations
export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const participants = await db.conversationParticipant.findMany({
      where: { userId: session.userId },
      include: {
        convo: {
          include: {
            participants: { include: { user: { select: { id: true, fullName: true } } } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: { id: true, fullName: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    // Build results with unread counts
    const results = await Promise.all(
      participants.map(async (p) => {
        const convo = p.convo;
        const lastMsg = convo.messages[0];

        const unreadCount = await db.chatMessage.count({
          where: {
            convoId: convo.id,
            createdAt: { gt: p.lastReadAt || new Date(0) },
            senderId: { not: session.userId },
            messageType: 'text',
          },
        });

        return {
          id: convo.id,
          name: convo.name,
          type: convo.type,
          unreadCount,
          participants: convo.participants.map(cp => ({
            userId: cp.userId,
            name: cp.user?.fullName ?? 'Unknown',
          })),
          lastMessage: lastMsg && lastMsg.messageType === 'text' ? {
            content: lastMsg.content,
            createdAt: lastMsg.createdAt.toISOString(),
            senderId: lastMsg.senderId,
            senderName: lastMsg.sender?.fullName ?? 'Unknown',
          } : null,
        };
      })
    );

    return NextResponse.json({ data: results });
  } catch (error: any) {
    console.error('[Chat] GET conversations error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/chat/conversations — create new conversation
export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { participantIds, type = 'direct', name } = body;

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'At least one participant is required' }, { status: 400 });
    }

    const allUserIds = [session.userId, ...participantIds];

    // For direct messages, check if conversation already exists between these two users
    if (type === 'direct' && participantIds.length === 1) {
      const allConversations = await db.conversation.findMany({
        where: { type: 'direct' },
        include: { participants: true },
      });
      for (const existing of allConversations) {
        if (existing.participants.length !== 2) continue;
        const existingIds = existing.participants.map(pp => pp.userId).sort();
        const newIds = [...allUserIds].sort();
        if (JSON.stringify(existingIds) === JSON.stringify(newIds)) {
          return NextResponse.json({ data: { id: existing.id, name: existing.name, type: existing.type } });
        }
      }
    }

    // Get participant names
    const users = await db.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, fullName: true },
    });

    const convoName = name || users.map(u => u.fullName).join(', ');

    // Create conversation with participants
    const conversation = await db.conversation.create({
      data: {
        name: convoName,
        type,
        participants: {
          create: allUserIds.map(uid => ({ userId: uid })),
        },
        messages: {
          create: {
            senderId: session.userId,
            content: 'Conversation created',
            messageType: 'system',
          },
        },
      },
    });

    return NextResponse.json({ data: { id: conversation.id, name: conversation.name, type: conversation.type } });
  } catch (error: any) {
    console.error('[Chat] POST conversation error:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

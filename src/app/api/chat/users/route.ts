import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/chat/users — search users for new conversation
export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const where: any = {
      id: { not: session.userId },
      status: 'active',
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await db.user.findMany({
      where,
      select: { id: true, fullName: true, username: true },
      take: 20,
      orderBy: { fullName: 'asc' },
    });

    return NextResponse.json({
      data: users.map(u => ({
        id: u.id,
        name: u.fullName,
        username: u.username,
      })),
    });
  } catch (error: any) {
    console.error('[Chat] GET users error:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}

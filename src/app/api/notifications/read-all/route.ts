import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const count = await db.notification.updateMany({
      where: {
        userId: session.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, data: { updatedCount: count.count } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark notifications as read';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

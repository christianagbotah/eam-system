import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const trades = await db.trade.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: trades });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load trades';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

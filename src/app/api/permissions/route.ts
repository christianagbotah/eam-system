import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const permissions = await db.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Group by module
    const grouped: Record<string, typeof permissions> = {};
    for (const p of permissions) {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push(p);
    }

    return NextResponse.json({
      success: true,
      data: {
        all: permissions,
        grouped,
        modules: Object.keys(grouped),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load permissions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

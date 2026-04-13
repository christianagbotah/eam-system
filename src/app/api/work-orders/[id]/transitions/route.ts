import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getAvailableTransitions } from '@/lib/state-machine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const wo = await db.workOrder.findUnique({ where: { id }, select: { status: true } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const transitions = await getAvailableTransitions('work_order', wo.status, session);
    return NextResponse.json({ success: true, data: transitions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load transitions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

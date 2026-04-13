import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * POST /api/production-orders/[id]/start
 *
 * Starts a released production order (released → in_progress).
 */
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
    const existing = await db.productionOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Production order not found' }, { status: 404 });
    }

    if (existing.status !== 'released') {
      return NextResponse.json(
        { success: false, error: `Cannot start an order in "${existing.status}" status. Only released orders can be started.` },
        { status: 400 },
      );
    }

    const now = new Date();
    const updated = await db.productionOrder.update({
      where: { id },
      data: { status: 'in_progress', actualStart: now },
      include: {
        workCenter: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'production_order',
        entityId: id,
        oldValues: JSON.stringify({ status: existing.status, actualStart: null }),
        newValues: JSON.stringify({ status: 'in_progress', actualStart: now.toISOString() }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start production order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

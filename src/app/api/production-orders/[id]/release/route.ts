import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, hasPermission, isAdmin } from '@/lib/auth';

/**
 * POST /api/production-orders/[id]/release
 *
 * Releases a planned production order (planned → released).
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
    if (!hasPermission(session, 'production_orders.release') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!hasAnyPermission(session, ['production_orders.update', 'production_orders.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.productionOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Production order not found' }, { status: 404 });
    }

    if (existing.status !== 'planned') {
      return NextResponse.json(
        { success: false, error: `Cannot release an order in "${existing.status}" status. Only planned orders can be released.` },
        { status: 400 },
      );
    }

    const updated = await db.productionOrder.update({
      where: { id },
      data: { status: 'released' },
      include: {
        workCenter: { select: { id: true, code: true, name: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'production_order',
        entityId: id,
        oldValues: JSON.stringify({ status: existing.status }),
        newValues: JSON.stringify({ status: 'released' }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to release production order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

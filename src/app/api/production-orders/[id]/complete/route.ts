import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * POST /api/production-orders/[id]/complete
 *
 * Completes an in-progress production order (in_progress → completed).
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
    const body = await request.json();
    const { completedQty, notes } = body;

    const existing = await db.productionOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Production order not found' }, { status: 404 });
    }

    if (existing.status !== 'in_progress') {
      return NextResponse.json(
        { success: false, error: `Cannot complete an order in "${existing.status}" status. Only in-progress orders can be completed.` },
        { status: 400 },
      );
    }

    const now = new Date();
    const updated = await db.productionOrder.update({
      where: { id },
      data: {
        status: 'completed',
        actualEnd: now,
        completedQty: completedQty != null ? parseFloat(completedQty) : existing.quantity,
        notes: notes ? `${existing.notes ? existing.notes + '\n' : ''}[Completed] ${notes}` : existing.notes,
      },
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
        oldValues: JSON.stringify({ status: existing.status, actualEnd: null, completedQty: existing.completedQty }),
        newValues: JSON.stringify({ status: 'completed', actualEnd: now.toISOString(), completedQty }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete production order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

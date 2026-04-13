import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/work-orders/[id]/status-history
 *
 * Returns the full status transition history for a work order.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Verify work order exists
    const wo = await db.workOrder.findUnique({
      where: { id },
      select: { id: true, woNumber: true, status: true },
    });

    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const history = await db.workOrderStatusHistory.findMany({
      where: { workOrderId: id },
      include: {
        performedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        workOrderId: id,
        woNumber: wo.woNumber,
        currentStatus: wo.status,
        transitions: history,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load status history';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

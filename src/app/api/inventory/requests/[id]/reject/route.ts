import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const existing = await db.inventoryRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    if (existing.status !== 'pending') return NextResponse.json({ success: false, error: 'Only pending requests can be rejected' }, { status: 400 });

    const updated = await db.inventoryRequest.update({
      where: { id },
      data: { status: 'rejected', approvedById: session.userId, approvedAt: new Date(), notes: body.notes ? (existing.notes ? `${existing.notes}\n[Rejected]: ${body.notes}` : `[Rejected]: ${body.notes}`) : existing.notes },
      include: {
        items: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });

    await db.auditLog.create({
      data: { userId: session.userId, action: 'update', entityType: 'inventory_request', entityId: id, oldValues: JSON.stringify({ status: 'pending' }), newValues: JSON.stringify({ status: 'rejected' }) },
    });

    // Notify the requester
    if (existing.requestedById && existing.requestedById !== session.userId) {
      await notifyUser(
        existing.requestedById,
        'inv_request_rejected',
        'Inventory Request Rejected',
        `Your request ${existing.requestNumber} has been rejected`,
        'inventory_request',
        id,
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reject request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

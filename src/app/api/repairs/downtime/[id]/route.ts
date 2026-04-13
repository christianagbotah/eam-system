import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/repairs/downtime/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await db.workOrderDowntime.findUnique({
      where: { id },
      include: { workOrder: { select: { id: true, woNumber: true, title: true, status: true } } },
    });
    if (!record) return NextResponse.json({ success: false, error: 'Downtime record not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: record });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load downtime record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/repairs/downtime/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { downtimeEnd, reason, category, impactLevel, productionLoss, notes } = body;

    const existing = await db.workOrderDowntime.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (downtimeEnd !== undefined) {
      const end = new Date(downtimeEnd);
      const start = new Date(existing.downtimeStart);
      data.downtimeEnd = end;
      data.durationMinutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);
    }
    if (reason !== undefined) data.reason = reason;
    if (category !== undefined) data.category = category;
    if (impactLevel !== undefined) data.impactLevel = impactLevel;
    if (productionLoss !== undefined) data.productionLoss = productionLoss;
    if (notes !== undefined) data.notes = notes;

    const updated = await db.workOrderDowntime.update({ where: { id }, data });

    await db.auditLog.create({
      data: { userId: session.userId, action: 'update', entityType: 'wo_downtime', entityId: id, oldValues: JSON.stringify(existing), newValues: JSON.stringify(data) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update downtime record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/repairs/downtime/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const existing = await db.workOrderDowntime.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await db.workOrderDowntime.delete({ where: { id } });

    await db.auditLog.create({
      data: { userId: session.userId, action: 'delete', entityType: 'wo_downtime', entityId: id, oldValues: JSON.stringify(existing) },
    });

    return NextResponse.json({ success: true, message: 'Downtime record deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete downtime record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

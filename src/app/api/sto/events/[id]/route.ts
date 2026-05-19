import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { StoPlanningService } from '@/services/sto/planning.service';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const event = await StoPlanningService.getEvent(id);

    if (!event) {
      return NextResponse.json({ success: false, error: 'STO event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load STO event';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const event = await StoPlanningService.updateEvent(id, body);

    await createAuditLog(session.userId, 'sto_event', 'update', id, {
      newValues: body,
    });

    return NextResponse.json({ success: true, data: event });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update STO event';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const { id } = await params;
    const { db } = await import('@/lib/db');

    const event = await db.stoEvent.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    await createAuditLog(session.userId, 'sto_event', 'delete', id, {
      newValues: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true, data: event });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel STO event';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

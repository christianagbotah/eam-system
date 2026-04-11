import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const location = await db.inventoryLocation.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        items: { take: 20 },
      },
    });

    if (!location) return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: location });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load location';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const existing = await db.inventoryLocation.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    for (const field of ['name', 'code', 'type', 'address', 'isActive']) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    const updated = await db.inventoryLocation.update({ where: { id }, data: updateData });

    await db.auditLog.create({
      data: { userId: session.userId, action: 'update', entityType: 'inventory_location', entityId: id, oldValues: JSON.stringify({ code: existing.code }), newValues: JSON.stringify(updateData) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update location';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const existing = await db.inventoryLocation.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });

    await db.inventoryLocation.update({ where: { id }, data: { isActive: false } });

    await db.auditLog.create({
      data: { userId: session.userId, action: 'delete', entityType: 'inventory_location', entityId: id, oldValues: JSON.stringify({ code: existing.code }) },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete location';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

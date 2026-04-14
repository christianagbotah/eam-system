import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        purchaseOrders: { take: 20, orderBy: { createdAt: 'desc' } },
        _count: { select: { purchaseOrders: true, items: true } },
      },
    });

    if (!supplier) return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: supplier });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load supplier';
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
    if (!hasPermission(session, 'inventory.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    for (const field of ['name', 'code', 'contactPerson', 'email', 'phone', 'address', 'city', 'country', 'website', 'rating', 'isActive']) {
      if (body[field] !== undefined) {
        updateData[field] = field === 'rating' ? parseInt(String(body[field]), 10) : body[field];
      }
    }

    const updated = await db.supplier.update({ where: { id }, data: updateData });

    await db.auditLog.create({
      data: { userId: session.userId, action: 'update', entityType: 'supplier', entityId: id, oldValues: JSON.stringify({ code: existing.code }), newValues: JSON.stringify(updateData) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update supplier';
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
    if (!hasPermission(session, 'inventory.delete') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });

    await db.supplier.update({ where: { id }, data: { isActive: false } });

    await db.auditLog.create({
      data: { userId: session.userId, action: 'delete', entityType: 'supplier', entityId: id, oldValues: JSON.stringify({ code: existing.code }) },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete supplier';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

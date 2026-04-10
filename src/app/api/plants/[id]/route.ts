import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

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

    const plant = await db.plant.findUnique({
      where: { id },
      include: {
        departments: {
          include: {
            supervisor: { select: { id: true, fullName: true, username: true } },
            _count: { select: { children: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!plant) {
      return NextResponse.json(
        { success: false, error: 'Plant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: plant });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load plant';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.plant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Plant not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = ['name', 'code', 'location', 'country', 'city', 'isActive'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Check code uniqueness if code is being updated
    if (updateData.code && updateData.code !== existing.code) {
      const codeExists = await db.plant.findUnique({ where: { code: updateData.code as string } });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Plant code already exists' },
          { status: 400 }
        );
      }
    }

    const updated = await db.plant.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'plant',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, code: existing.code }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update plant';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.plant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Plant not found' },
        { status: 404 }
      );
    }

    // Deactivate plant (soft delete)
    const deactivated = await db.plant.update({
      where: { id },
      data: { isActive: false },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'plant',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, code: existing.code, isActive: true }),
        newValues: JSON.stringify({ isActive: false }),
      },
    });

    return NextResponse.json({ success: true, data: deactivated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate plant';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

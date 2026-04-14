import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

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

    const plan = await db.qualityControlPlan.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Control plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load control plan';
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
    if (!hasPermission(session, 'quality.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.qualityControlPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Control plan not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'description', 'type', 'frequency',
      'itemId', 'assetId', 'characteristics', 'sampleSize', 'isActive',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'characteristics') {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.qualityControlPlan.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'quality_control_plan',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, isActive: existing.isActive }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update control plan';
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
    if (!hasPermission(session, 'quality.delete') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.qualityControlPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Control plan not found' },
        { status: 404 }
      );
    }

    await db.qualityControlPlan.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'quality_control_plan',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, message: 'Control plan deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete control plan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

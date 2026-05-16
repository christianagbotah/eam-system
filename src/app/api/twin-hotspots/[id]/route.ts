import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.twinHotspot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Twin hotspot not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'label', 'description', 'type', 'meshName', 'position',
      'lookAtPosition', 'icon', 'color', 'assetId',
      'linkedEntityType', 'linkedEntityId', 'visible', 'sortOrder',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'position' || field === 'lookAtPosition') {
          updateData[field] = body[field] !== null ? JSON.stringify(body[field]) : null;
        } else if (field === 'sortOrder') {
          updateData[field] = body[field] !== null ? parseInt(String(body[field]), 10) : 0;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.twinHotspot.update({
      where: { id },
      data: updateData,
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'twin_hotspot',
        entityId: id,
        oldValues: JSON.stringify({ label: existing.label, type: existing.type, visible: existing.visible }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update twin hotspot';
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

    if (!hasPermission(session, 'digital_twin.delete') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.twinHotspot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Twin hotspot not found' }, { status: 404 });
    }

    await db.twinHotspot.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'twin_hotspot',
        entityId: id,
        oldValues: JSON.stringify({ label: existing.label, sceneId: existing.sceneId }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete twin hotspot';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

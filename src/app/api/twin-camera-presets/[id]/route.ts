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

    const existing = await db.twinCameraPreset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Twin camera preset not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'description', 'position', 'target',
      'fov', 'near', 'far', 'isDefault', 'sortOrder',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'position' || field === 'target') {
          updateData[field] = body[field] !== null ? JSON.stringify(body[field]) : null;
        } else if (field === 'fov' || field === 'near' || field === 'far') {
          updateData[field] = body[field] !== null ? parseFloat(String(body[field])) : null;
        } else if (field === 'sortOrder') {
          updateData[field] = body[field] !== null ? parseInt(String(body[field]), 10) : 0;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // If setting as default, unset other defaults for this scene
    if (updateData.isDefault === true) {
      await db.twinCameraPreset.updateMany({
        where: { sceneId: existing.sceneId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await db.twinCameraPreset.update({
      where: { id },
      data: updateData,
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'twin_camera_preset',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, isDefault: existing.isDefault }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update twin camera preset';
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

    const existing = await db.twinCameraPreset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Twin camera preset not found' }, { status: 404 });
    }

    await db.twinCameraPreset.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'twin_camera_preset',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, sceneId: existing.sceneId }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete twin camera preset';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const preset = await db.twinCameraPreset.findUnique({
      where: { id },
      include: {
        scene: true,
      },
    });

    if (!preset) {
      return NextResponse.json({ success: false, error: 'Camera preset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: preset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load twin camera preset';
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

    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
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
      'fov', 'transitionDuration', 'sortOrder',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'position' || field === 'target') {
          updateData[field] = body[field] !== null ? JSON.stringify(body[field]) : null;
        } else if (field === 'fov' || field === 'transitionDuration') {
          updateData[field] = body[field] !== null ? parseFloat(String(body[field])) : null;
        } else if (field === 'sortOrder') {
          updateData[field] = body[field] !== null ? parseInt(String(body[field]), 10) : 0;
        } else {
          updateData[field] = body[field];
        }
      }
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
        oldValues: JSON.stringify({ name: existing.name, fov: existing.fov }),
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

    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
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

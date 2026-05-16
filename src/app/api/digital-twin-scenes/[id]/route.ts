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

    const scene = await db.digitalTwinScene.findUnique({
      where: { id },
      include: {
        twin: {
          select: { id: true, name: true, type: true, assetId: true, healthScore: true },
          include: {
            asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true, criticality: true } },
          },
        },
        model: {
          select: { id: true, name: true, format: true, fileUrl: true, fileName: true },
          include: {
            meshBindings: {
              include: {
                asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true, criticality: true } },
              },
              orderBy: { meshName: 'asc' },
            },
          },
        },
        createdBy: { select: { id: true, fullName: true, username: true } },
        hotspots: {
          include: {
            asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        annotations: {
          include: {
            author: { select: { id: true, fullName: true, username: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        cameraPresets: {
          orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!scene) {
      return NextResponse.json({ success: false, error: 'Digital twin scene not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: scene });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load digital twin scene';
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

    if (!hasPermission(session, 'digital_twin.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.digitalTwinScene.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Digital twin scene not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'description', 'modelId', 'backgroundImage',
      'lightingConfig', 'environment', 'skybox',
      'fogEnabled', 'fogColor', 'fogDensity', 'gridEnabled', 'isDefault',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'lightingConfig') {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else if (field === 'fogDensity') {
          updateData[field] = body[field] !== null ? parseFloat(String(body[field])) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // If setting as default, unset other defaults for this twin
    if (updateData.isDefault === true) {
      await db.digitalTwinScene.updateMany({
        where: { twinId: existing.twinId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await db.digitalTwinScene.update({
      where: { id },
      data: updateData,
      include: {
        twin: { select: { id: true, name: true, type: true } },
        model: { select: { id: true, name: true, format: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        _count: { select: { hotspots: true, annotations: true, cameraPresets: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'digital_twin_scene',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, isDefault: existing.isDefault, modelId: existing.modelId }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update digital twin scene';
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

    const existing = await db.digitalTwinScene.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Digital twin scene not found' }, { status: 404 });
    }

    // Delete child records first (hotspots, annotations, cameraPresets)
    await Promise.all([
      db.twinHotspot.deleteMany({ where: { sceneId: id } }),
      db.twinAnnotation.deleteMany({ where: { sceneId: id } }),
      db.twinCameraPreset.deleteMany({ where: { sceneId: id } }),
    ]);

    await db.digitalTwinScene.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'digital_twin_scene',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, twinId: existing.twinId }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete digital twin scene';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

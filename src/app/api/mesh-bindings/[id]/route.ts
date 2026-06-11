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

    const binding = await db.assetMeshBinding.findUnique({
      where: { id },
      include: {
        model: {
          select: { id: true, name: true, format: true, assetId: true },
          include: {
            asset: { select: { id: true, name: true, assetTag: true, status: true } },
          },
        },
        asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true, criticality: true, location: true } },
      },
    });

    if (!binding) {
      return NextResponse.json({ success: false, error: 'Mesh binding not found' }, { status: 404 });
    }

    // Get IoT device readings for the bound asset
    const iotDevices = await db.iotDevice.findMany({
      where: { assetId: binding.assetId, isActive: true },
      select: {
        id: true,
        name: true,
        deviceCode: true,
        parameter: true,
        unit: true,
        status: true,
        lastReading: true,
        lastSeen: true,
        thresholdMin: true,
        thresholdMax: true,
      },
      take: 10,
    });

    return NextResponse.json({ success: true, data: { ...binding, iotDevices } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load mesh binding';
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

    const existing = await db.assetMeshBinding.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Mesh binding not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['meshName', 'meshPath', 'meshType', 'assetId', 'colorOverride', 'opacity', 'isClickable', 'isVisible', 'explodeOffset', 'metadata'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'opacity') {
          updateData[field] = body[field] !== null ? parseFloat(String(body[field])) : null;
        } else if (field === 'explodeOffset' || field === 'metadata') {
          updateData[field] = body[field] !== null ? JSON.stringify(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // If updating meshName, check for duplicates
    if (updateData.meshName && updateData.meshName !== existing.meshName) {
      const duplicate = await db.assetMeshBinding.findFirst({
        where: { modelId: existing.modelId, meshName: updateData.meshName as string },
      });
      if (duplicate) {
        return NextResponse.json({ success: false, error: 'A binding for this mesh name already exists on this model' }, { status: 409 });
      }
    }

    // If updating assetId, verify asset exists
    if (updateData.assetId) {
      const asset = await db.asset.findUnique({ where: { id: updateData.assetId as string } });
      if (!asset) {
        return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
      }
    }

    const updated = await db.assetMeshBinding.update({
      where: { id },
      data: updateData,
      include: {
        model: { select: { id: true, name: true, format: true } },
        asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'asset_mesh_binding',
        entityId: id,
        oldValues: JSON.stringify({ meshName: existing.meshName, assetId: existing.assetId }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update mesh binding';
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

    const existing = await db.assetMeshBinding.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Mesh binding not found' }, { status: 404 });
    }

    await db.assetMeshBinding.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'asset_mesh_binding',
        entityId: id,
        oldValues: JSON.stringify({ meshName: existing.meshName, assetId: existing.assetId, modelId: existing.modelId }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete mesh binding';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

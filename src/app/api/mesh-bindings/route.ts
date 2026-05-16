import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const assetId = searchParams.get('assetId');

    if (!modelId) {
      return NextResponse.json({ success: false, error: 'modelId query parameter is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { modelId };

    if (assetId) {
      where.assetId = assetId;
    }

    const bindings = await db.assetMeshBinding.findMany({
      where,
      include: {
        model: { select: { id: true, name: true, format: true } },
        asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true, criticality: true } },
      },
      orderBy: { meshName: 'asc' },
    });

    return NextResponse.json({ success: true, data: bindings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load mesh bindings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { modelId, meshName, meshIndex, assetId, color, opacity, isInteractive } = body;

    if (!modelId) {
      return NextResponse.json({ success: false, error: 'Model ID is required' }, { status: 400 });
    }

    if (!meshName) {
      return NextResponse.json({ success: false, error: 'Mesh name is required' }, { status: 400 });
    }

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Asset ID is required' }, { status: 400 });
    }

    // Verify model exists
    const model = await db.assetModel.findUnique({ where: { id: modelId } });
    if (!model) {
      return NextResponse.json({ success: false, error: 'Asset model not found' }, { status: 404 });
    }

    // Verify asset exists
    const asset = await db.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Check for duplicate binding (same model + meshName)
    const existing = await db.assetMeshBinding.findFirst({
      where: { modelId, meshName },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'A binding for this mesh name already exists on this model' }, { status: 409 });
    }

    const binding = await db.assetMeshBinding.create({
      data: {
        modelId,
        meshName,
        meshIndex: meshIndex !== undefined ? parseInt(String(meshIndex), 10) : null,
        assetId,
        color: color || null,
        opacity: opacity !== undefined ? parseFloat(String(opacity)) : null,
        isInteractive: isInteractive !== undefined ? isInteractive : true,
      },
      include: {
        model: { select: { id: true, name: true, format: true } },
        asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'asset_mesh_binding',
        entityId: binding.id,
        newValues: JSON.stringify({ modelId, meshName, assetId }),
      },
    });

    return NextResponse.json({ success: true, data: binding }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create mesh binding';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

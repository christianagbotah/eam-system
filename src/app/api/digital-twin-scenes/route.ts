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
    const twinId = searchParams.get('twinId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!twinId) {
      return NextResponse.json({ success: false, error: 'twinId query parameter is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { twinId };

    const [scenes, total] = await Promise.all([
      db.digitalTwinScene.findMany({
        where,
        include: {
          twin: { select: { id: true, name: true, type: true, assetId: true } },
          model: { select: { id: true, name: true, format: true, fileUrl: true } },
          createdBy: { select: { id: true, fullName: true, username: true } },
          _count: {
            select: {
              hotspots: true,
              annotations: true,
              cameraPresets: true,
            },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.digitalTwinScene.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: scenes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load digital twin scenes';
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
    const {
      twinId,
      name,
      description,
      modelId,
      backgroundImage,
      lightingConfig,
      environment,
      skybox,
      fogEnabled,
      fogColor,
      fogDensity,
      gridEnabled,
      isDefault,
    } = body;

    if (!twinId) {
      return NextResponse.json({ success: false, error: 'Twin ID is required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Scene name is required' }, { status: 400 });
    }

    // Verify twin exists
    const twin = await db.digitalTwin.findUnique({ where: { id: twinId } });
    if (!twin) {
      return NextResponse.json({ success: false, error: 'Digital twin not found' }, { status: 404 });
    }

    // If a modelId is provided, verify it exists
    if (modelId) {
      const model = await db.assetModel.findUnique({ where: { id: modelId } });
      if (!model) {
        return NextResponse.json({ success: false, error: 'Asset model not found' }, { status: 404 });
      }
    }

    // If setting as default, unset other defaults for this twin
    if (isDefault) {
      await db.digitalTwinScene.updateMany({
        where: { twinId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const scene = await db.digitalTwinScene.create({
      data: {
        twinId,
        name,
        description: description || null,
        modelId: modelId || null,
        backgroundImage: backgroundImage || null,
        lightingConfig: lightingConfig ? JSON.stringify(lightingConfig) : null,
        environment: environment || null,
        skybox: skybox || null,
        fogEnabled: fogEnabled !== undefined ? fogEnabled : false,
        fogColor: fogColor || null,
        fogDensity: fogDensity !== undefined ? parseFloat(String(fogDensity)) : null,
        gridEnabled: gridEnabled !== undefined ? gridEnabled : true,
        isDefault: isDefault || false,
        createdById: session.userId,
      },
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
        action: 'create',
        entityType: 'digital_twin_scene',
        entityId: scene.id,
        newValues: JSON.stringify({ name, twinId, modelId, isDefault: isDefault || false }),
      },
    });

    return NextResponse.json({ success: true, data: scene }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create digital twin scene';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

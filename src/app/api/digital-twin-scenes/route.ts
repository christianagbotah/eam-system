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
    let page = parseInt(searchParams.get('page') || '1', 10);
    let limit = parseInt(searchParams.get('limit') || '20', 10);
    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.min(100, Math.max(1, isNaN(limit) ? 20 : limit));

    if (!twinId) {
      return NextResponse.json({ success: false, error: 'twinId query parameter is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { twinId };

    const [scenes, total] = await Promise.all([
      db.digitalTwinScene.findMany({
        where,
        include: {
          twin: { select: { id: true, name: true, type: true, assetId: true } },
          model: { select: { id: true, name: true, format: true, filePath: true } },
          createdBy: { select: { id: true, fullName: true, username: true } },
          _count: {
            select: {
              hotspots: true,
              annotations: true,
              cameraPresets: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
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
      sceneType,
      environment,
      backgroundColor,
      groundPlane,
      gridEnabled,
      ambientLight,
      directionalLight,
    } = body;

    if (!twinId) {
      return NextResponse.json({ success: false, error: 'Twin ID is required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Scene name is required' }, { status: 400 });
    }

    if (!modelId) {
      return NextResponse.json({ success: false, error: 'Model ID is required' }, { status: 400 });
    }

    // Verify twin exists
    const twin = await db.digitalTwin.findUnique({ where: { id: twinId } });
    if (!twin) {
      return NextResponse.json({ success: false, error: 'Digital twin not found' }, { status: 404 });
    }

    // Verify model exists
    const model = await db.assetModel.findUnique({ where: { id: modelId } });
    if (!model) {
      return NextResponse.json({ success: false, error: 'Asset model not found' }, { status: 404 });
    }

    const scene = await db.digitalTwinScene.create({
      data: {
        twinId,
        name,
        description: description || null,
        modelId,
        sceneType: sceneType || '3d',
        environment: environment || 'warehouse',
        backgroundColor: backgroundColor || '#1a1a2e',
        groundPlane: groundPlane !== undefined ? groundPlane : true,
        gridEnabled: gridEnabled !== undefined ? gridEnabled : true,
        ambientLight: ambientLight !== undefined ? parseFloat(String(ambientLight)) : 0.6,
        directionalLight: directionalLight !== undefined ? parseFloat(String(directionalLight)) : 0.8,
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
        newValues: JSON.stringify({ name, twinId, modelId, sceneType: sceneType || '3d' }),
      },
    });

    return NextResponse.json({ success: true, data: scene }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create digital twin scene';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

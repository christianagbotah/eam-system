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
    const sceneId = searchParams.get('sceneId');

    if (!sceneId) {
      return NextResponse.json({ success: false, error: 'sceneId query parameter is required' }, { status: 400 });
    }

    const presets = await db.twinCameraPreset.findMany({
      where: { sceneId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ success: true, data: presets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load twin camera presets';
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
      sceneId,
      name,
      description,
      position,
      target,
      fov,
      transitionDuration,
      sortOrder,
    } = body;

    if (!sceneId) {
      return NextResponse.json({ success: false, error: 'Scene ID is required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Preset name is required' }, { status: 400 });
    }

    if (!position) {
      return NextResponse.json({ success: false, error: 'Camera position is required' }, { status: 400 });
    }

    if (!target) {
      return NextResponse.json({ success: false, error: 'Camera target is required' }, { status: 400 });
    }

    // Verify scene exists
    const scene = await db.digitalTwinScene.findUnique({ where: { id: sceneId } });
    if (!scene) {
      return NextResponse.json({ success: false, error: 'Scene not found' }, { status: 404 });
    }

    const preset = await db.twinCameraPreset.create({
      data: {
        sceneId,
        name,
        description: description || null,
        position: JSON.stringify(position),
        target: JSON.stringify(target),
        fov: fov !== undefined ? parseFloat(String(fov)) : 50,
        transitionDuration: transitionDuration !== undefined ? parseFloat(String(transitionDuration)) : 1.0,
        sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'twin_camera_preset',
        entityId: preset.id,
        newValues: JSON.stringify({ name, sceneId }),
      },
    });

    return NextResponse.json({ success: true, data: preset }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create twin camera preset';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

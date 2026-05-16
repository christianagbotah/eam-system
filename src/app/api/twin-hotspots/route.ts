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
    const type = searchParams.get('type');

    if (!sceneId) {
      return NextResponse.json({ success: false, error: 'sceneId query parameter is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { sceneId };

    if (type) {
      where.type = type;
    }

    const hotspots = await db.twinHotspot.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true, criticality: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ success: true, data: hotspots });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load twin hotspots';
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
      label,
      description,
      type,
      meshName,
      position,
      lookAtPosition,
      icon,
      color,
      assetId,
      linkedEntityType,
      linkedEntityId,
      visible,
      sortOrder,
    } = body;

    if (!sceneId) {
      return NextResponse.json({ success: false, error: 'Scene ID is required' }, { status: 400 });
    }

    if (!label) {
      return NextResponse.json({ success: false, error: 'Hotspot label is required' }, { status: 400 });
    }

    // Verify scene exists
    const scene = await db.digitalTwinScene.findUnique({ where: { id: sceneId } });
    if (!scene) {
      return NextResponse.json({ success: false, error: 'Scene not found' }, { status: 404 });
    }

    // If assetId provided, verify asset exists
    if (assetId) {
      const asset = await db.asset.findUnique({ where: { id: assetId } });
      if (!asset) {
        return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
      }
    }

    const hotspot = await db.twinHotspot.create({
      data: {
        sceneId,
        label,
        description: description || null,
        type: type || 'info',
        meshName: meshName || null,
        position: position ? JSON.stringify(position) : null,
        lookAtPosition: lookAtPosition ? JSON.stringify(lookAtPosition) : null,
        icon: icon || null,
        color: color || null,
        assetId: assetId || null,
        linkedEntityType: linkedEntityType || null,
        linkedEntityId: linkedEntityId || null,
        visible: visible !== undefined ? visible : true,
        sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0,
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'twin_hotspot',
        entityId: hotspot.id,
        newValues: JSON.stringify({ label, sceneId, type: type || 'info', assetId }),
      },
    });

    return NextResponse.json({ success: true, data: hotspot }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create twin hotspot';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

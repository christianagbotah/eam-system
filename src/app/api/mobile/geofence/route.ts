// ============================================================================
// GET /api/mobile/geofence — Get geofence zones & POST geofence events
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:mobile:geofence');

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const plantId = url.searchParams.get('plantId');
    const activeOnly = url.searchParams.get('active') !== 'false';

    const where: Record<string, unknown> = {};
    if (plantId) where.plantId = plantId;
    if (activeOnly) where.isActive = true;

    const zones = await db.geofenceZone.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: zones });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch geofence zones';
    logger.error('Geofence GET error', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { zoneId, eventType, coordinates } = body;

    if (!zoneId || !eventType) {
      return NextResponse.json({ success: false, error: 'zoneId and eventType are required' }, { status: 400 });
    }

    if (!['entered', 'exited'].includes(eventType)) {
      return NextResponse.json({ success: false, error: 'eventType must be "entered" or "exited"' }, { status: 400 });
    }

    // Verify zone exists
    const zone = await db.geofenceZone.findUnique({
      where: { id: zoneId },
      select: { id: true, name: true, hazardLevel: true, requiresPermit: true },
    });

    if (!zone) {
      return NextResponse.json({ success: false, error: 'Geofence zone not found' }, { status: 404 });
    }

    // Record the event
    const event = await db.geofenceEvent.create({
      data: {
        zoneId,
        userId: session.userId,
        eventType,
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
      },
    });

    logger.info('Geofence event recorded', {
      zoneId,
      zoneName: zone.name,
      eventType,
      userId: session.userId,
      hazardLevel: zone.hazardLevel,
    });

    return NextResponse.json({
      success: true,
      data: {
        event,
        zone: {
          name: zone.name,
          hazardLevel: zone.hazardLevel,
          requiresPermit: zone.requiresPermit,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record geofence event';
    logger.error('Geofence POST error', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

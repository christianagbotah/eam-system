import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const device = await db.iotDevice.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        createdBy: { select: { id: true, fullName: true } },
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            rule: { select: { id: true, name: true } },
          },
        },
        rules: {
          include: {
            createdBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: device });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load device';
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

    const { id } = await params;
    const body = await request.json();

    const existing = await db.iotDevice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    const updatable = [
      'name', 'type', 'protocol', 'status', 'location', 'assetId', 'groupId',
      'parameter', 'unit', 'thresholdMin', 'thresholdMax', 'batteryLevel',
      'signalStrength', 'firmwareVersion', 'lastReading', 'lastSeen',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of updatable) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    if (data.protocol) {
      data.protocol = (data.protocol as string).toLowerCase();
    }
    if (data.lastSeen) {
      data.lastSeen = new Date(data.lastSeen as string);
    }

    const device = await db.iotDevice.update({
      where: { id },
      data,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'iot_device',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, status: existing.status }),
        newValues: JSON.stringify({ name: device.name, status: device.status }),
      },
    });

    return NextResponse.json({ success: true, data: device });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update device';
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

    const { id } = await params;

    const existing = await db.iotDevice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    await db.iotDevice.update({
      where: { id },
      data: { isActive: false },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'iot_device',
        entityId: id,
        oldValues: JSON.stringify({ deviceCode: existing.deviceCode, name: existing.name }),
      },
    });

    return NextResponse.json({ success: true, message: 'Device removed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete device';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

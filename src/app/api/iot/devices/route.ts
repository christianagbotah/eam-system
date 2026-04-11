import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: generate device code IOT-NNNN
async function generateDeviceCode(): Promise<string> {
  const latest = await db.iotDevice.findFirst({
    orderBy: { deviceCode: 'desc' },
    select: { deviceCode: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.deviceCode.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `IOT-${String(nextNum).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = { isActive: true };

    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { deviceCode: { contains: search } },
        { location: { contains: search } },
        { parameter: { contains: search } },
      ];
    }

    const hasFilter = status || type || search;

    const [devices, total] = await Promise.all([
      db.iotDevice.findMany({
        where: hasFilter ? where : { isActive: true },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { readings: true, alerts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.iotDevice.count({
        where: hasFilter ? where : { isActive: true },
      }),
    ]);

    // KPI counts
    const [totalCount, onlineCount, offlineCount, warningCount, errorCount] = await Promise.all([
      db.iotDevice.count({ where: { isActive: true } }),
      db.iotDevice.count({ where: { isActive: true, status: 'online' } }),
      db.iotDevice.count({ where: { isActive: true, status: 'offline' } }),
      db.iotDevice.count({ where: { isActive: true, status: 'warning' } }),
      db.iotDevice.count({ where: { isActive: true, status: 'error' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: devices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        online: onlineCount,
        offline: offlineCount,
        warning: warningCount,
        error: errorCount,
        alerting: warningCount + errorCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load devices';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      type,
      protocol,
      location,
      assetId,
      groupId,
      parameter,
      unit,
      thresholdMin,
      thresholdMax,
      firmwareVersion,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Device name is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ success: false, error: 'Device type is required' }, { status: 400 });
    }
    if (!protocol) {
      return NextResponse.json({ success: false, error: 'Protocol is required' }, { status: 400 });
    }
    if (!parameter) {
      return NextResponse.json({ success: false, error: 'Parameter is required' }, { status: 400 });
    }
    if (!unit) {
      return NextResponse.json({ success: false, error: 'Unit is required' }, { status: 400 });
    }

    const deviceCode = await generateDeviceCode();

    const device = await db.iotDevice.create({
      data: {
        deviceCode,
        name,
        type,
        protocol: protocol.toLowerCase(),
        location: location || null,
        assetId: assetId || null,
        groupId: groupId || null,
        parameter,
        unit,
        thresholdMin: thresholdMin ?? null,
        thresholdMax: thresholdMax ?? null,
        firmwareVersion: firmwareVersion || null,
        status: 'offline',
        createdById: session.userId,
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'iot_device',
        entityId: device.id,
        newValues: JSON.stringify({ deviceCode, name, type, protocol }),
      },
    });

    return NextResponse.json({ success: true, data: device }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create device';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

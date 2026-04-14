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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Verify device exists
    const device = await db.iotDevice.findUnique({
      where: { id, isActive: true },
    });
    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { deviceId: id };

    if (from || to) {
      where.timestamp = {};
      if (from) (where.timestamp as Record<string, unknown>).gte = new Date(from);
      if (to) (where.timestamp as Record<string, unknown>).lte = new Date(to);
    }

    const [readings, total] = await Promise.all([
      db.iotReading.findMany({
        where: from || to ? where : { deviceId: id },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.iotReading.count({
        where: from || to ? where : { deviceId: id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: readings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load readings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'iot.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { value, unit } = body;

    if (value === undefined || value === null) {
      return NextResponse.json({ success: false, error: 'Reading value is required' }, { status: 400 });
    }

    // Verify device exists
    const device = await db.iotDevice.findUnique({
      where: { id, isActive: true },
      include: { rules: { where: { isActive: true } } },
    });
    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    const reading = await db.iotReading.create({
      data: {
        deviceId: id,
        value: parseFloat(value),
        unit: unit || device.unit,
      },
    });

    // Update device last reading and last seen
    await db.iotDevice.update({
      where: { id },
      data: {
        lastReading: parseFloat(value),
        lastSeen: new Date(),
      },
    });

    // Evaluate against rules and create alerts if threshold breached
    const alertsCreated: Array<{ id: string; severity: string; message: string }> = [];

    for (const rule of device.rules) {
      // Check if alert already created within cooldown
      const cooldownAgo = new Date(Date.now() - rule.cooldownMinutes * 60 * 1000);
      const recentAlert = await db.iotAlert.findFirst({
        where: {
          deviceId: id,
          ruleId: rule.id,
          createdAt: { gte: cooldownAgo },
        },
      });

      if (recentAlert) continue; // Still in cooldown

      let breached = false;
      const val = parseFloat(value);

      switch (rule.operator) {
        case 'gt': breached = val > rule.threshold; break;
        case 'lt': breached = val < rule.threshold; break;
        case 'gte': breached = val >= rule.threshold; break;
        case 'lte': breached = val <= rule.threshold; break;
        case 'eq': breached = val === rule.threshold; break;
      }

      if (breached) {
        const alert = await db.iotAlert.create({
          data: {
            deviceId: id,
            ruleId: rule.id,
            severity: rule.severity,
            message: `${rule.parameter} ${rule.operator} ${rule.threshold} ${device.unit}: reading ${val} ${device.unit}`,
            value: val,
            threshold: rule.threshold,
          },
        });
        alertsCreated.push({
          id: alert.id,
          severity: rule.severity,
          message: alert.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: reading,
      alertsTriggered: alertsCreated,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit reading';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

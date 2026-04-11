import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    const where: Record<string, unknown> = { isActive: true };
    if (deviceId) where.deviceId = deviceId;

    const rules = await db.iotAlertRule.findMany({
      where: deviceId ? where : { isActive: true },
      include: {
        device: { select: { id: true, name: true, deviceCode: true, parameter: true, unit: true } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { alerts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load rules';
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
      deviceId,
      parameter,
      operator,
      threshold,
      severity,
      cooldownMinutes,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Rule name is required' }, { status: 400 });
    }
    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'Device is required' }, { status: 400 });
    }
    if (!parameter) {
      return NextResponse.json({ success: false, error: 'Parameter is required' }, { status: 400 });
    }
    if (!operator) {
      return NextResponse.json({ success: false, error: 'Operator is required' }, { status: 400 });
    }
    if (threshold === undefined || threshold === null) {
      return NextResponse.json({ success: false, error: 'Threshold is required' }, { status: 400 });
    }

    // Verify device exists
    const device = await db.iotDevice.findUnique({
      where: { id: deviceId, isActive: true },
    });
    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    const validOperators = ['gt', 'lt', 'gte', 'lte', 'eq'];
    if (!validOperators.includes(operator)) {
      return NextResponse.json({ success: false, error: `Invalid operator. Must be one of: ${validOperators.join(', ')}` }, { status: 400 });
    }

    const validSeverities = ['info', 'warning', 'critical'];
    const finalSeverity = severity && validSeverities.includes(severity) ? severity : 'warning';

    const rule = await db.iotAlertRule.create({
      data: {
        name,
        deviceId,
        parameter,
        operator,
        threshold: parseFloat(threshold),
        severity: finalSeverity,
        cooldownMinutes: cooldownMinutes ? parseInt(cooldownMinutes) : 5,
        createdById: session.userId,
      },
      include: {
        device: { select: { id: true, name: true, deviceCode: true, parameter: true, unit: true } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { alerts: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'iot_alert_rule',
        entityId: rule.id,
        newValues: JSON.stringify({ name, parameter, operator, threshold }),
      },
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create rule';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

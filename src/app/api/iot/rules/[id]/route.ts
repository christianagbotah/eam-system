import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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

    const existing = await db.iotAlertRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    const { toggleActive, name, parameter, operator, threshold, severity, cooldownMinutes } = body;

    // Toggle active state
    if (toggleActive !== undefined) {
      const rule = await db.iotAlertRule.update({
        where: { id },
        data: { isActive: toggleActive },
        include: {
          device: { select: { id: true, name: true, deviceCode: true, parameter: true, unit: true } },
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { alerts: true } },
        },
      });
      return NextResponse.json({ success: true, data: rule });
    }

    // Update fields
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (parameter !== undefined) data.parameter = parameter;
    if (operator !== undefined) data.operator = operator;
    if (threshold !== undefined) data.threshold = parseFloat(threshold);
    if (severity !== undefined) data.severity = severity;
    if (cooldownMinutes !== undefined) data.cooldownMinutes = parseInt(cooldownMinutes);

    const rule = await db.iotAlertRule.update({
      where: { id },
      data,
      include: {
        device: { select: { id: true, name: true, deviceCode: true, parameter: true, unit: true } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { alerts: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'iot_alert_rule',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name }),
        newValues: JSON.stringify({ name: rule.name }),
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update rule';
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

    const existing = await db.iotAlertRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    await db.iotAlertRule.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'iot_alert_rule',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name }),
      },
    });

    return NextResponse.json({ success: true, message: 'Rule deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete rule';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

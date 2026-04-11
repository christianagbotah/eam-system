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
    const { action } = body; // 'acknowledge' or 'resolve'

    const existing = await db.iotAlert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
    }

    if (action === 'acknowledge') {
      if (existing.status !== 'active') {
        return NextResponse.json({ success: false, error: 'Only active alerts can be acknowledged' }, { status: 400 });
      }
      const alert = await db.iotAlert.update({
        where: { id },
        data: {
          status: 'acknowledged',
          acknowledgedBy: session.userId,
          acknowledgedAt: new Date(),
        },
        include: {
          device: { select: { id: true, name: true, deviceCode: true } },
          rule: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json({ success: true, data: alert });
    }

    if (action === 'resolve') {
      const alert = await db.iotAlert.update({
        where: { id },
        data: {
          status: 'resolved',
          acknowledgedBy: existing.acknowledgedBy || session.userId,
          acknowledgedAt: existing.acknowledgedAt || new Date(),
          resolvedAt: new Date(),
        },
        include: {
          device: { select: { id: true, name: true, deviceCode: true } },
          rule: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json({ success: true, data: alert });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use "acknowledge" or "resolve".' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update alert';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

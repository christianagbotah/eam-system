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
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (deviceId) where.deviceId = deviceId;
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const hasFilter = deviceId || status || severity;

    const [alerts, total] = await Promise.all([
      db.iotAlert.findMany({
        where: hasFilter ? where : undefined,
        include: {
          device: { select: { id: true, name: true, deviceCode: true } },
          rule: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.iotAlert.count({
        where: hasFilter ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load alerts';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

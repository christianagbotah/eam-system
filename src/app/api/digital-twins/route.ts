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
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { type: { contains: search } },
        { asset: { name: { contains: search } } },
      ];
    }

    const [twins, total] = await Promise.all([
      db.digitalTwin.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
          createdBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.digitalTwin.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    const [totalKpi, activeCount, inactiveCount] = await Promise.all([
      db.digitalTwin.count(),
      db.digitalTwin.count({ where: { isActive: true } }),
      db.digitalTwin.count({ where: { isActive: false } }),
    ]);

    // Count alerts from IoT devices linked to assets that have twins
    const activeAlertsCount = await db.iotAlert.count({
      where: {
        status: 'active',
        severity: { in: ['warning', 'critical'] },
        device: {
          assetId: { in: (await db.digitalTwin.findMany({ where: { isActive: true }, select: { assetId: true } })).map(t => t.assetId) },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: twins,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpis: {
        total: totalKpi,
        activeSync: activeCount,
        simulationRuns: 0,
        alerts: activeAlertsCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load digital twins';
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
      assetId,
      name,
      description,
      type,
      parameters,
      connections,
      specification,
      healthScore,
      syncInterval,
    } = body;

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Asset ID is required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Twin name is required' }, { status: 400 });
    }

    // Check if twin already exists for this asset
    const existing = await db.digitalTwin.findUnique({ where: { assetId } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'A digital twin already exists for this asset' }, { status: 409 });
    }

    const twin = await db.digitalTwin.create({
      data: {
        assetId,
        name,
        description,
        type: type || 'other',
        parameters: parameters ? JSON.stringify(parameters) : '{}',
        connections: connections ? JSON.stringify(connections) : '{}',
        specification: specification ? JSON.stringify(specification) : null,
        healthScore: healthScore ? parseInt(String(healthScore), 10) : 0,
        syncInterval: syncInterval || '5min',
        createdById: session.userId,
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'digital_twin',
        entityId: twin.id,
        newValues: JSON.stringify({ name, assetId }),
      },
    });

    return NextResponse.json({ success: true, data: twin }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create digital twin';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

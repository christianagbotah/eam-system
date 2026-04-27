import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [plans, total] = await Promise.all([
      db.qualityControlPlan.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.qualityControlPlan.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, activeCount] = await Promise.all([
      db.qualityControlPlan.count(),
      db.qualityControlPlan.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        active: activeCount,
        inactive: totalCount - activeCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load control plans';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'quality.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      frequency,
      itemId,
      assetId,
      characteristics,
      sampleSize,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Plan name is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ success: false, error: 'Type is required' }, { status: 400 });
    }
    if (!frequency) {
      return NextResponse.json({ success: false, error: 'Frequency is required' }, { status: 400 });
    }

    const plan = await db.qualityControlPlan.create({
      data: {
        name,
        description: description || null,
        type,
        frequency,
        itemId: itemId || null,
        assetId: assetId || null,
        characteristics: characteristics ? JSON.stringify(characteristics) : '[]',
        sampleSize: sampleSize || null,
        isActive: true,
        createdById: session.userId,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'quality_control_plan',
        entityId: plan.id,
        newValues: JSON.stringify({ name, type, frequency }),
      },
    });

    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create control plan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

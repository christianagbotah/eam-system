import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: generate work center code WC-NNNN
async function generateWCCode(): Promise<string> {
  const latest = await db.workCenter.findFirst({
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.code.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `WC-${String(nextNum).padStart(4, '0')}`;
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
        { code: { contains: search } },
        { location: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [workCenters, total] = await Promise.all([
      db.workCenter.findMany({
        where: Object.keys(where).length > 1 || where.OR ? where : undefined,
        include: {
          createdBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.workCenter.count({
        where: Object.keys(where).length > 1 || where.OR ? where : { isActive: true },
      }),
    ]);

    // KPI counts
    const [totalCount, activeCount, idleCount, maintenanceCount] = await Promise.all([
      db.workCenter.count({ where: { isActive: true } }),
      db.workCenter.count({ where: { isActive: true, status: 'active' } }),
      db.workCenter.count({ where: { isActive: true, status: 'inactive' } }),
      db.workCenter.count({ where: { isActive: true, status: 'maintenance' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: workCenters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        active: activeCount,
        idle: idleCount,
        maintenance: maintenanceCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work centers';
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
      description,
      type,
      status,
      location,
      capacity,
      capacityUnit,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Work center name is required' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ success: false, error: 'Type is required' }, { status: 400 });
    }

    const code = await generateWCCode();

    const workCenter = await db.workCenter.create({
      data: {
        code,
        name,
        description: description || null,
        type,
        status: status || 'active',
        location: location || null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        capacityUnit: capacityUnit || 'units/hour',
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'work_center',
        entityId: workCenter.id,
        newValues: JSON.stringify({ code, name, type }),
      },
    });

    return NextResponse.json({ success: true, data: workCenter }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create work center';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

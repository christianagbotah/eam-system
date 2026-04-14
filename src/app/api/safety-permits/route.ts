import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

// Helper: generate permit number SP-YYYYMM-NNNN
async function generatePermitNumber(): Promise<string> {
  const now = new Date();
  const prefix = `SP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.safetyPermit.findFirst({
    where: { permitNumber: { startsWith: prefix } },
    orderBy: { permitNumber: 'desc' },
    select: { permitNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.permitNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
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

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { permitNumber: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const [permits, total] = await Promise.all([
      db.safetyPermit.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          requestedBy: { select: { id: true, fullName: true, username: true } },
          approvedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.safetyPermit.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, activeCount, pendingCount, expiredCount, completedCount, cancelledCount] = await Promise.all([
      db.safetyPermit.count(),
      db.safetyPermit.count({ where: { status: 'active' } }),
      db.safetyPermit.count({ where: { status: 'pending' } }),
      db.safetyPermit.count({ where: { status: 'expired' } }),
      db.safetyPermit.count({ where: { status: 'completed' } }),
      db.safetyPermit.count({ where: { status: 'cancelled' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: permits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        active: activeCount,
        pending: pendingCount,
        expired: expiredCount,
        completed: completedCount,
        cancelled: cancelledCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load safety permits';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'safety_permits.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      status,
      location,
      startDate,
      endDate,
      hazardAssessment,
      precautions,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'Start date and end date are required' }, { status: 400 });
    }

    const permitNumber = await generatePermitNumber();

    const permit = await db.safetyPermit.create({
      data: {
        permitNumber,
        title,
        description: description || '',
        type: type || 'hot_work',
        status: status || 'pending',
        location: location || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        requestedById: session.userId,
        hazardAssessment: hazardAssessment || null,
        precautions: precautions || '[]',
        notes: notes || null,
      },
      include: {
        requestedBy: { select: { id: true, fullName: true, username: true } },
        approvedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'safety_permit',
        entityId: permit.id,
        newValues: JSON.stringify({ permitNumber, title, type }),
      },
    });

    return NextResponse.json({ success: true, data: permit }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create safety permit';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

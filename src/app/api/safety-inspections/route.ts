import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: generate inspection number SINS-YYYYMM-NNNN
async function generateInspectionNumber(): Promise<string> {
  const now = new Date();
  const prefix = `SINS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.safetyInspection.findFirst({
    where: { inspectionNumber: { startsWith: prefix } },
    orderBy: { inspectionNumber: 'desc' },
    select: { inspectionNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.inspectionNumber.split('-');
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
        { inspectionNumber: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const [inspections, total] = await Promise.all([
      db.safetyInspection.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { scheduledDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.safetyInspection.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, passedCount, failedCount, scheduledCount, inProgressCount] = await Promise.all([
      db.safetyInspection.count(),
      db.safetyInspection.count({ where: { status: 'completed' } }),
      db.safetyInspection.count({ where: { status: 'failed' } }),
      db.safetyInspection.count({ where: { status: 'scheduled' } }),
      db.safetyInspection.count({ where: { status: 'in_progress' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: inspections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        completed: passedCount,
        failed: failedCount,
        scheduled: scheduledCount,
        inProgress: inProgressCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load safety inspections';
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
      title,
      description,
      type,
      status,
      scheduledDate,
      location,
      inspectorId,
      findings,
      score,
      maxScore,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    if (!scheduledDate) {
      return NextResponse.json({ success: false, error: 'Scheduled date is required' }, { status: 400 });
    }

    const inspectionNumber = await generateInspectionNumber();

    const inspection = await db.safetyInspection.create({
      data: {
        inspectionNumber,
        title,
        description: description || null,
        type: type || 'routine',
        status: status || 'scheduled',
        scheduledDate: new Date(scheduledDate),
        location: location || null,
        inspectorId: inspectorId || null,
        findings: findings || '[]',
        score: score || null,
        maxScore: maxScore || null,
        notes: notes || null,
        createdById: session.userId,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'safety_inspection',
        entityId: inspection.id,
        newValues: JSON.stringify({ inspectionNumber, title, type }),
      },
    });

    return NextResponse.json({ success: true, data: inspection }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create safety inspection';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

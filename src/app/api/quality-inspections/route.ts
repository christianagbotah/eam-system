import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: generate inspection number QI-YYYYMM-NNNN
async function generateInspectionNumber(): Promise<string> {
  const now = new Date();
  const prefix = `QI-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.qualityInspection.findFirst({
    where: { inspectionNumber: { startsWith: prefix } },
    orderBy: { inspectionNumber: 'desc' },
    select: { inspectionNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.inspectionNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
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
        { description: { contains: search } },
      ];
    }

    const [inspections, total] = await Promise.all([
      db.qualityInspection.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          inspectedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.qualityInspection.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, passedCount, failedCount, pendingCount, inProgressCount] = await Promise.all([
      db.qualityInspection.count(),
      db.qualityInspection.count({ where: { status: 'passed' } }),
      db.qualityInspection.count({ where: { status: 'failed' } }),
      db.qualityInspection.count({ where: { status: 'pending' } }),
      db.qualityInspection.count({ where: { status: 'in_progress' } }),
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
        passed: passedCount,
        failed: failedCount,
        pending: pendingCount,
        inProgress: inProgressCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load inspections';
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
      scheduledDate,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ success: false, error: 'Type is required' }, { status: 400 });
    }

    const inspectionNumber = await generateInspectionNumber();

    const inspection = await db.qualityInspection.create({
      data: {
        inspectionNumber,
        title,
        description: description || null,
        type,
        status: 'pending',
        inspectedById: session.userId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        defects: '[]',
        notes: notes || null,
      },
      include: {
        inspectedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'quality_inspection',
        entityId: inspection.id,
        newValues: JSON.stringify({ inspectionNumber, title, type }),
      },
    });

    return NextResponse.json({ success: true, data: inspection }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create inspection';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

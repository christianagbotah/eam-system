import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: generate audit number QA-YYYYMM-NNNN
async function generateAuditNumber(): Promise<string> {
  const now = new Date();
  const prefix = `QA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.qualityAudit.findFirst({
    where: { auditNumber: { startsWith: prefix } },
    orderBy: { auditNumber: 'desc' },
    select: { auditNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.auditNumber.split('-');
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
        { auditNumber: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [audits, total] = await Promise.all([
      db.qualityAudit.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          auditedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.qualityAudit.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, plannedCount, inProgressCount, completedCount] = await Promise.all([
      db.qualityAudit.count(),
      db.qualityAudit.count({ where: { status: 'planned' } }),
      db.qualityAudit.count({ where: { status: 'in_progress' } }),
      db.qualityAudit.count({ where: { status: 'completed' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: audits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        planned: plannedCount,
        inProgress: inProgressCount,
        completed: completedCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load audits';
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
      auditedById,
      departmentId,
      scope,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ success: false, error: 'Type is required' }, { status: 400 });
    }
    if (!scheduledDate) {
      return NextResponse.json({ success: false, error: 'Scheduled date is required' }, { status: 400 });
    }

    const auditNumber = await generateAuditNumber();

    const audit = await db.qualityAudit.create({
      data: {
        auditNumber,
        title,
        description: description || null,
        type,
        status: 'planned',
        scheduledDate: new Date(scheduledDate),
        auditedById: auditedById || null,
        departmentId: departmentId || null,
        scope: scope || null,
        findings: '[]',
        notes: notes || null,
        createdById: session.userId,
      },
      include: {
        auditedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'quality_audit',
        entityId: audit.id,
        newValues: JSON.stringify({ auditNumber, title, type }),
      },
    });

    return NextResponse.json({ success: true, data: audit }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create audit';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

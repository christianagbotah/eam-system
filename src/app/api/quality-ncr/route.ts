import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

// Helper: generate NCR number NCR-YYYYMM-NNNN
async function generateNcrNumber(): Promise<string> {
  const now = new Date();
  const prefix = `NCR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.nonConformanceReport.findFirst({
    where: { ncrNumber: { startsWith: prefix } },
    orderBy: { ncrNumber: 'desc' },
    select: { ncrNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.ncrNumber.split('-');
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
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { ncrNumber: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [ncrs, total] = await Promise.all([
      db.nonConformanceReport.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          raisedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.nonConformanceReport.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, openCount, investigatingCount, closedCount] = await Promise.all([
      db.nonConformanceReport.count(),
      db.nonConformanceReport.count({ where: { status: 'open' } }),
      db.nonConformanceReport.count({ where: { status: 'investigating' } }),
      db.nonConformanceReport.count({ where: { status: 'closed' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: ncrs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        open: openCount,
        investigating: investigatingCount,
        closed: closedCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load NCRs';
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
      title,
      description,
      severity,
      type,
      sourceInspectionId,
      assetId,
      itemId,
      departmentId,
      dueDate,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }

    const ncrNumber = await generateNcrNumber();

    const ncr = await db.nonConformanceReport.create({
      data: {
        ncrNumber,
        title,
        description,
        severity: severity || 'minor',
        type: type || 'product',
        status: 'open',
        sourceInspectionId: sourceInspectionId || null,
        assetId: assetId || null,
        itemId: itemId || null,
        departmentId: departmentId || null,
        raisedById: session.userId,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
      },
      include: {
        raisedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'non_conformance_report',
        entityId: ncr.id,
        newValues: JSON.stringify({ ncrNumber, title, severity, type }),
      },
    });

    return NextResponse.json({ success: true, data: ncr }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create NCR';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

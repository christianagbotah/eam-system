import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

// Helper: generate CAPA number CAPA-YYYYMM-NNNN
async function generateCapaNumber(): Promise<string> {
  const now = new Date();
  const prefix = `CAPA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.correctiveAction.findFirst({
    where: { capaNumber: { startsWith: prefix } },
    orderBy: { capaNumber: 'desc' },
    select: { capaNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.capaNumber.split('-');
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
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { capaNumber: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [capas, total] = await Promise.all([
      db.correctiveAction.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.correctiveAction.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, openCount, inProgressCount, verifiedCount] = await Promise.all([
      db.correctiveAction.count(),
      db.correctiveAction.count({ where: { status: 'open' } }),
      db.correctiveAction.count({ where: { status: 'in_progress' } }),
      db.correctiveAction.count({ where: { status: 'verified' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: capas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        open: openCount,
        inProgress: inProgressCount,
        verified: verifiedCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load CAPAs';
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
      type,
      source,
      sourceId,
      severity,
      responsibleId,
      dueDate,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }

    const capaNumber = await generateCapaNumber();

    const capa = await db.correctiveAction.create({
      data: {
        capaNumber,
        title,
        description,
        type: type || 'corrective',
        source: source || 'ncr',
        sourceId: sourceId || null,
        severity: severity || 'medium',
        status: 'open',
        correctiveAction: '[]',
        responsibleId: responsibleId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'corrective_action',
        entityId: capa.id,
        newValues: JSON.stringify({ capaNumber, title, type, source }),
      },
    });

    return NextResponse.json({ success: true, data: capa }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create CAPA';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

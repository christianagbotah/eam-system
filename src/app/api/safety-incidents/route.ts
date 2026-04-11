import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: generate incident number SI-YYYYMM-NNNN
async function generateIncidentNumber(): Promise<string> {
  const now = new Date();
  const prefix = `SI-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.safetyIncident.findFirst({
    where: { incidentNumber: { startsWith: prefix } },
    orderBy: { incidentNumber: 'desc' },
    select: { incidentNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.incidentNumber.split('-');
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
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.incidentDate = dateFilter;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { incidentNumber: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const [incidents, total] = await Promise.all([
      db.safetyIncident.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          reportedBy: { select: { id: true, fullName: true, username: true } },
          investigatedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { incidentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.safetyIncident.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, openCount, investigatingCount, closedCount] = await Promise.all([
      db.safetyIncident.count(),
      db.safetyIncident.count({ where: { status: 'open' } }),
      db.safetyIncident.count({ where: { status: 'investigating' } }),
      db.safetyIncident.count({ where: { status: 'closed' } }),
    ]);

    // Days since last incident
    const lastIncident = await db.safetyIncident.findFirst({
      orderBy: { incidentDate: 'desc' },
      select: { incidentDate: true },
    });
    const daysSinceLast = lastIncident
      ? Math.floor((Date.now() - lastIncident.incidentDate.getTime()) / 86400000)
      : 0;

    return NextResponse.json({
      success: true,
      data: incidents,
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
        daysSinceLast,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load safety incidents';
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
      severity,
      status,
      incidentDate,
      location,
      rootCause,
      correctiveAction,
      daysLost,
      cost,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    if (!incidentDate) {
      return NextResponse.json({ success: false, error: 'Incident date is required' }, { status: 400 });
    }

    const incidentNumber = await generateIncidentNumber();

    const incident = await db.safetyIncident.create({
      data: {
        incidentNumber,
        title,
        description: description || '',
        type: type || 'near_miss',
        severity: severity || 'medium',
        status: status || 'open',
        incidentDate: new Date(incidentDate),
        location: location || null,
        reportedById: session.userId,
        rootCause: rootCause || null,
        correctiveAction: correctiveAction || null,
        daysLost: daysLost || 0,
        cost: cost || null,
        notes: notes || null,
      },
      include: {
        reportedBy: { select: { id: true, fullName: true, username: true } },
        investigatedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'safety_incident',
        entityId: incident.id,
        newValues: JSON.stringify({ incidentNumber, title, type, severity }),
      },
    });

    return NextResponse.json({ success: true, data: incident }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create safety incident';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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
        { description: { contains: search } },
        { trainer: { contains: search } },
      ];
    }

    const [trainings, total] = await Promise.all([
      db.safetyTraining.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { scheduledDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.safetyTraining.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, completedCount, inProgressCount, overdueCount, plannedCount] = await Promise.all([
      db.safetyTraining.count(),
      db.safetyTraining.count({ where: { status: 'completed' } }),
      db.safetyTraining.count({ where: { status: 'in_progress' } }),
      db.safetyTraining.count({ where: { status: 'cancelled' } }),
      db.safetyTraining.count({ where: { status: 'planned' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: trainings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        completed: completedCount,
        inProgress: inProgressCount,
        overdue: overdueCount,
        planned: plannedCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load safety training';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'safety_training.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      status,
      trainer,
      scheduledDate,
      completedDate,
      location,
      attendees,
      durationHours,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const training = await db.safetyTraining.create({
      data: {
        title,
        description: description || null,
        type: type || 'induction',
        status: status || 'planned',
        trainer: trainer || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        completedDate: completedDate ? new Date(completedDate) : null,
        location: location || null,
        attendees: attendees || '[]',
        durationHours: durationHours || null,
        notes: notes || null,
        createdById: session.userId,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'safety_training',
        entityId: training.id,
        newValues: JSON.stringify({ title, type, status }),
      },
    });

    return NextResponse.json({ success: true, data: training }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create safety training';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

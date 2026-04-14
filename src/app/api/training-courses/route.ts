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
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { instructor: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [courses, total] = await Promise.all([
      db.trainingCourse.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.trainingCourse.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, activeCount, completedCount, certificationCount] = await Promise.all([
      db.trainingCourse.count(),
      db.trainingCourse.count({ where: { status: 'active' } }),
      db.trainingCourse.count({ where: { status: 'archived' } }),
      db.trainingCourse.count({ where: { certification: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: courses,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpis: {
        total: totalCount,
        active: activeCount,
        completed: completedCount,
        withCertification: certificationCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load training courses';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'operations.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, category, type, durationHours, instructor, maxParticipants, certification, validForMonths, notes } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Course title is required' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ success: false, error: 'Category is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ success: false, error: 'Type is required' }, { status: 400 });
    }
    if (durationHours === undefined || durationHours === null || isNaN(Number(durationHours))) {
      return NextResponse.json({ success: false, error: 'Duration (hours) is required' }, { status: 400 });
    }

    const course = await db.trainingCourse.create({
      data: {
        title,
        description: description || null,
        category,
        type,
        durationHours: Number(durationHours),
        instructor: instructor || null,
        maxParticipants: maxParticipants ? Number(maxParticipants) : null,
        certification: certification === true,
        validForMonths: validForMonths ? Number(validForMonths) : null,
        notes: notes || null,
        createdById: session.userId,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'training_course',
        entityId: course.id,
        newValues: JSON.stringify({ title, category, type, durationHours }),
      },
    });

    return NextResponse.json({ success: true, data: course }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create training course';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

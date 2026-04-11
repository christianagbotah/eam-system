import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [surveys, total] = await Promise.all([
      db.survey.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.survey.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, activeCount, totalResponses] = await Promise.all([
      db.survey.count(),
      db.survey.count({ where: { status: 'active' } }),
      db.survey.aggregate({ _sum: { totalResponses: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: surveys,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpis: {
        total: totalCount,
        active: activeCount,
        totalResponses: totalResponses._sum.totalResponses || 0,
        closed: totalCount - activeCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load surveys';
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
    const { title, description, type, targetGroup, questions } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Survey title is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ success: false, error: 'Survey type is required' }, { status: 400 });
    }

    // Parse questions from textarea (one per line) or accept JSON array
    let parsedQuestions: string[];
    if (Array.isArray(questions)) {
      parsedQuestions = questions.filter(Boolean);
    } else if (typeof questions === 'string') {
      parsedQuestions = questions.split('\n').map(s => s.trim()).filter(Boolean);
    } else {
      parsedQuestions = [];
    }

    const survey = await db.survey.create({
      data: {
        title,
        description: description || null,
        type,
        targetGroup: targetGroup || null,
        questions: JSON.stringify(parsedQuestions),
        createdById: session.userId,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'survey',
        entityId: survey.id,
        newValues: JSON.stringify({ title, type, questionCount: parsedQuestions.length }),
      },
    });

    return NextResponse.json({ success: true, data: survey }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create survey';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

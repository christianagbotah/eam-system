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
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [checklists, total] = await Promise.all([
      db.checklist.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.checklist.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, activeCount, totalItems] = await Promise.all([
      db.checklist.count({ where: { isActive: true } }),
      db.checklist.count({ where: { isActive: true } }),
      db.checklistItem.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: checklists,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpis: {
        total: totalCount,
        active: activeCount,
        totalItems,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load checklists';
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
    const { title, description, type, frequency, departmentId, assetId, items } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Checklist title is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ success: false, error: 'Checklist type is required' }, { status: 400 });
    }
    if (!frequency) {
      return NextResponse.json({ success: false, error: 'Frequency is required' }, { status: 400 });
    }

    // Parse items from textarea (one per line) or accept JSON array
    let parsedItems: string[];
    if (Array.isArray(items)) {
      parsedItems = items.filter(Boolean);
    } else if (typeof items === 'string') {
      parsedItems = items.split('\n').map(s => s.trim()).filter(Boolean);
    } else {
      parsedItems = [];
    }

    const checklist = await db.checklist.create({
      data: {
        title,
        description: description || null,
        type,
        frequency,
        departmentId: departmentId || null,
        assetId: assetId || null,
        createdById: session.userId,
        items: {
          create: parsedItems.map((item, index) => ({
            item,
            sortOrder: index,
            isRequired: true,
          })),
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'checklist',
        entityId: checklist.id,
        newValues: JSON.stringify({ title, type, frequency, itemCount: parsedItems.length }),
      },
    });

    return NextResponse.json({ success: true, data: checklist }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create checklist';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

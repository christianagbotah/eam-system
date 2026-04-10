import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/sessions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');
    const assignedToId = searchParams.get('assignedToId');

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (assignedToId) where.assignedToId = assignedToId;

    const workOrders = await db.workOrder.findMany({
      where,
      include: {
        creator: { select: { id: true, fullName: true } },
        teamMembers: { orderBy: { createdAt: 'asc' } },
        materials: { orderBy: { createdAt: 'desc' } },
        comments: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
        request: { select: { id: true, requestNumber, title } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: workOrders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, type, priority, assetName, estimatedHours } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const count = await db.workOrder.count();
    const woNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const wo = await db.workOrder.create({
      data: {
        woNumber,
        title,
        description,
        type: type || 'corrective',
        priority: priority || 'medium',
        status: 'draft',
        assetName,
        estimatedHours,
        createdById: session.userId,
      },
      include: {
        creator: { select: { id: true, fullName: true } },
      },
    });

    await db.wOStatusHistory.create({
      data: {
        workOrderId: wo.id,
        toStatus: 'draft',
        changedById: session.userId,
        reason: 'Work order created',
      },
    });

    return NextResponse.json({ success: true, data: wo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

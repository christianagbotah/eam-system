import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/sessions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const requests = await db.maintenanceRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, fullName: true, username: true } },
        reviewer: { select: { id: true, fullName: true, username: true } },
        comments: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: requests });
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
    const { title, description, priority, machineDown, assetName, location, category } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    // Generate request number
    const count = await db.maintenanceRequest.count();
    const requestNumber = `MR-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const mr = await db.maintenanceRequest.create({
      data: {
        requestNumber,
        title,
        description,
        priority: priority || 'medium',
        machineDown: machineDown || false,
        assetName,
        location,
        category,
        status: 'pending',
        workflowStatus: 'pending',
        requestedById: session.userId,
      },
      include: {
        requester: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.mRStatusHistory.create({
      data: {
        maintenanceRequestId: mr.id,
        toStatus: 'pending',
        changedById: session.userId,
        reason: 'Request created',
      },
    });

    return NextResponse.json({ success: true, data: mr }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

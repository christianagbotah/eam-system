import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

// GET /api/repairs/tool-requests
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    const { searchParams } = new URL(request.url);

    const workOrderId = searchParams.get('workOrderId');
    const status = searchParams.get('status');
    const requestedById = searchParams.get('requestedById');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};
    if (workOrderId) where.workOrderId = workOrderId;
    if (status) where.status = status;
    if (requestedById) where.requestedById = requestedById;

    if (session && !isAdmin(session) && !session.roles.includes('supervisor') && !session.roles.includes('planner') && !session.roles.includes('store_keeper')) {
      where.requestedById = session.userId;
    }

    const [requests, total] = await Promise.all([
      db.repairToolRequest.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          requestedBy: { select: { id: true, fullName: true, username: true } },
          supervisorApprovedBy: { select: { id: true, fullName: true } },
          storekeeperApprovedBy: { select: { id: true, fullName: true } },
          issuedByUser: { select: { id: true, fullName: true } },
          returnedByUser: { select: { id: true, fullName: true } },
          workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
          tool: { select: { id: true, toolCode: true, name: true, status: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.repairToolRequest.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({ success: true, data: requests, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load tool requests';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/tool-requests
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { workOrderId, toolId, toolName, reason, notes } = body;

    if (!workOrderId || !toolName || !reason) {
      return NextResponse.json({ success: false, error: 'workOrderId, toolName, and reason are required' }, { status: 400 });
    }

    const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });

    const toolReq = await db.repairToolRequest.create({
      data: {
        workOrderId, toolId: toolId || null, toolName, reason, notes: notes || null,
        status: 'pending', requestedById: session.userId,
      },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        workOrder: { select: { id: true, woNumber: true, title: true } },
        tool: toolId ? { select: { id: true, toolCode: true, name: true, status: true } } : null,
      },
    });

    if (wo.assignedSupervisorId) {
      await db.notification.create({
        data: {
          userId: wo.assignedSupervisorId, type: 'repair_tool_request',
          title: 'Tool Request Pending Approval',
          message: `${toolReq.requestedBy.fullName} requested tool "${toolName}" for WO ${wo.woNumber}`,
          entityType: 'repair_tool_request', entityId: toolReq.id, actionUrl: 'maintenance-work-orders',
        },
      });
    }

    await db.auditLog.create({
      data: { userId: session.userId, action: 'create', entityType: 'repair_tool_request', entityId: toolReq.id, newValues: JSON.stringify({ workOrderId, toolName, reason }) },
    });

    return NextResponse.json({ success: true, data: toolReq }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create tool request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

const URGENCY_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
const VALID_URGENCIES = ['low', 'normal', 'high', 'critical'];

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
    const stats = searchParams.get('stats') === 'true';

    const where: Record<string, unknown> = {};
    if (workOrderId) where.workOrderId = workOrderId;
    if (status) where.status = status;
    if (requestedById) where.requestedById = requestedById;

    if (session && !isAdmin(session) && !session.roles.includes('maintenance_supervisor') && !session.roles.includes('maintenance_planner') && !session.roles.includes('store_keeper')) {
      where.requestedById = session.userId;
    }

    // Stats endpoint
    if (stats) {
      const statsWhere = Object.keys(where).length > 0 ? where : undefined;
      const [
        total, pending, supervisorApproved, storekeeperApproved, issued, returned, rejected,
        overdueCount,
      ] = await Promise.all([
        db.repairToolRequest.count({ where: statsWhere }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'pending' } }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'supervisor_approved' } }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'storekeeper_approved' } }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'issued' } }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'returned' } }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'rejected' } }),
        db.repairToolRequest.count({
          where: {
            ...statsWhere,
            status: 'pending',
            createdAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      const byUrgency = await db.repairToolRequest.groupBy({
        by: ['urgency'],
        where: statsWhere,
        _count: true,
      });

      return NextResponse.json({
        success: true,
        data: {
          total, pending, supervisorApproved, storekeeperApproved, issued, returned, rejected, overdueCount,
          byUrgency: byUrgency.map(u => ({ urgency: u.urgency, count: u._count })),
        },
      });
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
          tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, condition: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.repairToolRequest.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // Sort: urgency (critical first), then createdAt desc
    const sorted = requests.sort((a, b) => {
      const aUrgency = URGENCY_ORDER[a.urgency] ?? 2;
      const bUrgency = URGENCY_ORDER[b.urgency] ?? 2;
      if (aUrgency !== bUrgency) return aUrgency - bUrgency;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Add isOverdue flag for pending requests older than 24h
    const overdueThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const enriched = sorted.map(r => ({
      ...r,
      isOverdue: r.status === 'pending' && r.createdAt < overdueThreshold,
    }));

    return NextResponse.json({ success: true, data: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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
    const { workOrderId, toolId, toolName, reason, notes, urgency } = body;

    if (!workOrderId || !toolName || !reason) {
      return NextResponse.json({ success: false, error: 'workOrderId, toolName, and reason are required' }, { status: 400 });
    }

    const resolvedUrgency = VALID_URGENCIES.includes(urgency) ? urgency : 'normal';

    const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });

    // Validate tool if toolId provided
    let warnings: string[] = [];
    if (toolId) {
      const tool = await db.tool.findUnique({ where: { id: toolId } });
      if (!tool) {
        return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });
      }
      // Check if tool is available
      if (tool.status !== 'available') {
        warnings.push(`Tool "${tool.name}" is currently ${tool.status}. It may not be available for immediate issue.`);
      }
      // Check for duplicate pending request for the same WO and tool
      const existingPending = await db.repairToolRequest.findFirst({
        where: { workOrderId, toolId, status: 'pending' },
      });
      if (existingPending) {
        return NextResponse.json({ success: false, error: 'A pending tool request already exists for this tool and work order' }, { status: 409 });
      }
    }

    const toolReq = await db.repairToolRequest.create({
      data: {
        workOrderId, toolId: toolId || null, toolName, reason, notes: notes || null,
        status: 'pending', requestedById: session.userId, urgency: resolvedUrgency,
      },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        workOrder: { select: { id: true, woNumber: true, title: true } },
        tool: { select: { id: true, toolCode: true, name: true, status: true, condition: true } },
      },
    });

    if (wo.assignedSupervisorId) {
      await db.notification.create({
        data: {
          userId: wo.assignedSupervisorId, type: 'repair_tool_request',
          title: 'Tool Request Pending Approval',
          message: `${toolReq.requestedBy.fullName} requested tool "${toolName}" for WO ${wo.woNumber}${resolvedUrgency !== 'normal' ? ` [${resolvedUrgency.toUpperCase()}]` : ''}`,
          entityType: 'repair_tool_request', entityId: toolReq.id, actionUrl: 'maintenance-work-orders',
        },
      });
    }

    await db.auditLog.create({
      data: { userId: session.userId, action: 'create', entityType: 'repair_tool_request', entityId: toolReq.id, newValues: JSON.stringify({ workOrderId, toolName, reason, urgency: resolvedUrgency }) },
    });

    return NextResponse.json({ success: true, data: toolReq, warnings: warnings.length > 0 ? warnings : undefined }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create tool request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

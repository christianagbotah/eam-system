import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/repairs/tool-transfers
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const toolId = searchParams.get('toolId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const stats = searchParams.get('stats') === 'true';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (toolId) where.toolId = toolId;

    // Search filter for tool name, user names
    if (search) {
      where.OR = [
        { tool: { name: { contains: search, mode: 'insensitive' } } },
        { tool: { toolCode: { contains: search, mode: 'insensitive' } } },
        { fromUser: { fullName: { contains: search, mode: 'insensitive' } } },
        { toUser: { fullName: { contains: search, mode: 'insensitive' } } },
        { requestedBy: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Store keepers and admins see all; technicians see their own
    if (session && !session.roles.includes('admin') && !session.roles.includes('store_keeper') && !session.roles.includes('maintenance_supervisor') && !session.roles.includes('maintenance_planner')) {
      const userFilter = { OR: [{ fromUserId: session.userId }, { toUserId: session.userId }, { requestedById: session.userId }] };
      if (where.OR && search) {
        // Merge search OR with user filter
        where.AND = [{ OR: where.OR }, userFilter];
        delete where.OR;
      } else {
        where.OR = userFilter.OR;
      }
    }

    // Stats endpoint
    if (stats) {
      const statsWhere = Object.keys(where).length > 0 ? where : undefined;
      const [
        total, pending, storekeeperApproved, awaitingHandover, transferred, rejected,
      ] = await Promise.all([
        db.toolTransferRequest.count({ where: statsWhere }),
        db.toolTransferRequest.count({ where: { ...statsWhere, status: 'pending' } }),
        db.toolTransferRequest.count({ where: { ...statsWhere, status: 'storekeeper_approved' } }),
        db.toolTransferRequest.count({ where: { ...statsWhere, status: 'awaiting_handover' } }),
        db.toolTransferRequest.count({ where: { ...statsWhere, status: 'transferred' } }),
        db.toolTransferRequest.count({ where: { ...statsWhere, status: 'rejected' } }),
      ]);

      return NextResponse.json({
        success: true,
        data: { total, pending, storekeeperApproved, awaitingHandover, transferred, rejected },
      });
    }

    const [transfers, total] = await Promise.all([
      db.toolTransferRequest.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          tool: { select: { id: true, toolCode: true, name: true, status: true, category: true } },
          fromUser: { select: { id: true, fullName: true, username: true } },
          toUser: { select: { id: true, fullName: true, username: true } },
          requestedBy: { select: { id: true, fullName: true } },
          storekeeperApprovedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.toolTransferRequest.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({ success: true, data: transfers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load tool transfers';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/tool-transfers
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { toolId, fromUserId, toUserId, reason, notes } = body;

    if (!toolId || !fromUserId || !toUserId || !reason) {
      return NextResponse.json({ success: false, error: 'toolId, fromUserId, toUserId, and reason are required' }, { status: 400 });
    }

    if (fromUserId === toUserId) {
      return NextResponse.json({ success: false, error: 'Cannot transfer tool to the same person' }, { status: 400 });
    }

    // Verify tool exists and is assigned to fromUser
    const tool = await db.tool.findUnique({ where: { id: toolId } });
    if (!tool) return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });

    if (tool.assignedToId !== fromUserId && !session.roles.includes('admin') && !session.roles.includes('store_keeper')) {
      return NextResponse.json({ success: false, error: 'Tool is not currently assigned to the specified user' }, { status: 400 });
    }

    const transfer = await db.toolTransferRequest.create({
      data: {
        toolId, fromUserId, toUserId, reason, notes: notes || null,
        status: 'pending', requestedById: session.userId,
      },
      include: {
        tool: { select: { id: true, toolCode: true, name: true } },
        fromUser: { select: { id: true, fullName: true } },
        toUser: { select: { id: true, fullName: true } },
        requestedBy: { select: { id: true, fullName: true } },
      },
    });

    // Notify store keepers
    const storeKeepers = await db.user.findMany({ where: { userRoles: { some: { role: { slug: 'store_keeper' } } }, status: 'active' }, select: { id: true } });
    for (const sk of storeKeepers) {
      await db.notification.create({
        data: {
          userId: sk.id, type: 'tool_transfer_request',
          title: 'Tool Transfer Request',
          message: `${transfer.requestedBy.fullName} requested transfer of "${tool.name}" from ${transfer.fromUser.fullName} to ${transfer.toUser.fullName}`,
          entityType: 'tool_transfer_request', entityId: transfer.id, actionUrl: 'maintenance-tools',
        },
      });
    }

    await db.auditLog.create({
      data: { userId: session.userId, action: 'create', entityType: 'tool_transfer_request', entityId: transfer.id, newValues: JSON.stringify({ toolId, fromUserId, toUserId, reason }) },
    });

    return NextResponse.json({ success: true, data: transfer }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create tool transfer request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

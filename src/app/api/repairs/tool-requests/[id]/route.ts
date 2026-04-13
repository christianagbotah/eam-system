import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/repairs/tool-requests/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const toolReq = await db.repairToolRequest.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, fullName: true, username: true } },
        supervisorApprovedBy: { select: { id: true, fullName: true } },
        storekeeperApprovedBy: { select: { id: true, fullName: true } },
        issuedByUser: { select: { id: true, fullName: true } },
        returnedByUser: { select: { id: true, fullName: true } },
        workOrder: { select: { id: true, woNumber: true, title: true, status: true, assignedSupervisor: { select: { id: true, fullName: true } } } },
        tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, location: true } },
      },
    });
    if (!toolReq) return NextResponse.json({ success: false, error: 'Tool request not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: toolReq });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load tool request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/tool-requests/[id] — workflow actions
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    const toolReq = await db.repairToolRequest.findUnique({
      where: { id },
      include: {
        workOrder: { select: { id: true, woNumber: true, title: true, assignedSupervisorId: true } },
        requestedBy: { select: { id: true, fullName: true } },
        tool: true,
      },
    });
    if (!toolReq) return NextResponse.json({ success: false, error: 'Tool request not found' }, { status: 404 });

    const now = new Date();
    let updated: typeof toolReq;

    switch (action) {
      case 'supervisor_approve': {
        if (toolReq.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot approve: status is ${toolReq.status}` }, { status: 400 });
        updated = await db.repairToolRequest.update({ where: { id }, data: { status: 'supervisor_approved', supervisorApprovedById: session.userId, supervisorApprovedAt: now } });
        const storeKeepers = await db.user.findMany({ where: { userRoles: { some: { role: { slug: 'store_keeper' } } }, status: 'active' }, select: { id: true } });
        for (const sk of storeKeepers) {
          await db.notification.create({ data: { userId: sk.id, type: 'repair_tool_request', title: 'Tool Request Awaiting Store Approval', message: `"${toolReq.toolName}" approved by supervisor for WO ${toolReq.workOrder.woNumber}`, entityType: 'repair_tool_request', entityId: id } });
        }
        await db.notification.create({ data: { userId: toolReq.requestedById, type: 'repair_tool_request', title: 'Tool Request Approved', message: `Your request for "${toolReq.toolName}" was approved by supervisor`, entityType: 'repair_tool_request', entityId: id } });
        break;
      }

      case 'supervisor_reject': {
        if (toolReq.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot reject: status is ${toolReq.status}` }, { status: 400 });
        updated = await db.repairToolRequest.update({ where: { id }, data: { status: 'rejected', supervisorApprovedById: session.userId, supervisorApprovedAt: now, notes: notes ? `${toolReq.notes || ''}\n[Rejected] ${notes}` : toolReq.notes } });
        await db.notification.create({ data: { userId: toolReq.requestedById, type: 'repair_tool_request', title: 'Tool Request Rejected', message: `Your request for "${toolReq.toolName}" was rejected`, entityType: 'repair_tool_request', entityId: id } });
        break;
      }

      case 'storekeeper_approve': {
        if (toolReq.status !== 'supervisor_approved') return NextResponse.json({ success: false, error: `Cannot approve: status is ${toolReq.status}` }, { status: 400 });
        updated = await db.repairToolRequest.update({ where: { id }, data: { status: 'storekeeper_approved', storekeeperApprovedById: session.userId, storekeeperApprovedAt: now } });
        await db.notification.create({ data: { userId: toolReq.requestedById, type: 'repair_tool_request', title: 'Tool Ready for Pickup', message: `"${toolReq.toolName}" is approved and ready for issuance`, entityType: 'repair_tool_request', entityId: id } });
        break;
      }

      case 'storekeeper_reject': {
        if (toolReq.status !== 'supervisor_approved') return NextResponse.json({ success: false, error: `Cannot reject: status is ${toolReq.status}` }, { status: 400 });
        updated = await db.repairToolRequest.update({ where: { id }, data: { status: 'rejected', storekeeperApprovedById: session.userId, storekeeperApprovedAt: now, notes: notes ? `${toolReq.notes || ''}\n[Rejected by Store] ${notes}` : toolReq.notes } });
        await db.notification.create({ data: { userId: toolReq.requestedById, type: 'repair_tool_request', title: 'Tool Request Rejected by Store', message: `"${toolReq.toolName}" was rejected by store keeper`, entityType: 'repair_tool_request', entityId: id } });
        break;
      }

      case 'issue': {
        if (toolReq.status !== 'storekeeper_approved') return NextResponse.json({ success: false, error: `Cannot issue: status is ${toolReq.status}` }, { status: 400 });
        // Update tool status to checked_out
        if (toolReq.toolId) {
          await db.tool.update({ where: { id: toolReq.toolId }, data: { status: 'checked_out', assignedToId: toolReq.requestedById, checkedOutAt: now } });
          await db.toolTransaction.create({ data: { toolId: toolReq.toolId, type: 'checkout', toUserId: toolReq.requestedById, notes: `Issued for WO ${toolReq.workOrder.woNumber}`, performedById: session.userId } });
        }
        updated = await db.repairToolRequest.update({ where: { id }, data: { status: 'issued', issuedById: session.userId, issuedAt: now } });
        await db.notification.create({ data: { userId: toolReq.requestedById, type: 'repair_tool_request', title: 'Tool Issued', message: `"${toolReq.toolName}" has been issued to you for WO ${toolReq.workOrder.woNumber}`, entityType: 'repair_tool_request', entityId: id } });
        break;
      }

      case 'return': {
        if (toolReq.status !== 'issued') return NextResponse.json({ success: false, error: `Cannot return: status is ${toolReq.status}` }, { status: 400 });
        if (toolReq.toolId) {
          await db.tool.update({ where: { id: toolReq.toolId }, data: { status: 'available', assignedToId: null, checkedOutAt: null } });
          await db.toolTransaction.create({ data: { toolId: toolReq.toolId, type: 'return', fromUserId: toolReq.requestedById, notes: `Returned from WO ${toolReq.workOrder.woNumber}`, performedById: session.userId } });
        }
        updated = await db.repairToolRequest.update({ where: { id }, data: { status: 'returned', returnedById: session.userId, returnedAt: now } });
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    await db.auditLog.create({
      data: { userId: session.userId, action: `tool_request_${action}`, entityType: 'repair_tool_request', entityId: id, newValues: JSON.stringify({ action, status: updated?.status }) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

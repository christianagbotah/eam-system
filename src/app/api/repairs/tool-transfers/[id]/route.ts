import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/repairs/tool-transfers/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const transfer = await db.toolTransferRequest.findUnique({
      where: { id },
      include: {
        tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, location: true } },
        fromUser: { select: { id: true, fullName: true, username: true, department: true } },
        toUser: { select: { id: true, fullName: true, username: true, department: true } },
        requestedBy: { select: { id: true, fullName: true } },
        storekeeperApprovedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!transfer) return NextResponse.json({ success: false, error: 'Transfer request not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: transfer });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load transfer request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/tool-transfers/[id] — workflow actions
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    const transfer = await db.toolTransferRequest.findUnique({
      where: { id },
      include: {
        tool: true,
        fromUser: { select: { id: true, fullName: true } },
        toUser: { select: { id: true, fullName: true } },
        requestedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!transfer) return NextResponse.json({ success: false, error: 'Transfer request not found' }, { status: 404 });

    const now = new Date();
    let updated: typeof transfer;

    switch (action) {
      case 'storekeeper_approve': {
        if (transfer.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot approve: status is ${transfer.status}` }, { status: 400 });
        // Execute the transfer
        await db.tool.update({
          where: { id: transfer.toolId },
          data: { assignedToId: transfer.toUserId, status: 'checked_out' },
        });
        await db.toolTransaction.create({
          data: {
            toolId: transfer.toolId, type: 'transfer',
            fromUserId: transfer.fromUserId, toUserId: transfer.toUserId,
            notes: `Transfer approved: ${transfer.reason}`, performedById: session.userId,
          },
        });
        updated = await db.toolTransferRequest.update({
          where: { id }, data: { status: 'transferred', storekeeperApprovedById: session.userId, storekeeperApprovedAt: now, transferredAt: now },
        });
        // Notify both parties
        await db.notification.create({ data: { userId: transfer.fromUserId, type: 'tool_transfer_request', title: 'Tool Transferred Out', message: `"${transfer.tool.name}" has been transferred to ${transfer.toUser.fullName}`, entityType: 'tool_transfer_request', entityId: id } });
        await db.notification.create({ data: { userId: transfer.toUserId, type: 'tool_transfer_request', title: 'Tool Received', message: `"${transfer.tool.name}" has been transferred to you from ${transfer.fromUser.fullName}`, entityType: 'tool_transfer_request', entityId: id } });
        break;
      }

      case 'storekeeper_reject': {
        if (transfer.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot reject: status is ${transfer.status}` }, { status: 400 });
        updated = await db.toolTransferRequest.update({
          where: { id }, data: { status: 'rejected', storekeeperApprovedById: session.userId, storekeeperApprovedAt: now, notes: notes ? `${transfer.notes || ''}\n[Rejected] ${notes}` : transfer.notes },
        });
        await db.notification.create({ data: { userId: transfer.requestedById, type: 'tool_transfer_request', title: 'Tool Transfer Rejected', message: `Transfer of "${transfer.tool.name}" was rejected by store keeper`, entityType: 'tool_transfer_request', entityId: id } });
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    await db.auditLog.create({
      data: { userId: session.userId, action: `tool_transfer_${action}`, entityType: 'tool_transfer_request', entityId: id, newValues: JSON.stringify({ action, status: updated?.status }) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

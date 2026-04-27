import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

const VALID_CONDITIONS = ['new', 'good', 'fair', 'poor'];

// GET /api/repairs/tool-transfers/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const transfer = await db.toolTransferRequest.findUnique({
      where: { id },
      include: {
        tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, location: true, condition: true } },
        fromUser: { select: { id: true, fullName: true, username: true, department: true } },
        toUser: { select: { id: true, fullName: true, username: true, department: true } },
        requestedBy: { select: { id: true, fullName: true } },
        storekeeperApprovedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!transfer) return NextResponse.json({ success: false, error: 'Transfer request not found' }, { status: 404 });

    // Auto-complete check: if both parties accepted but status is still awaiting_handover
    if (transfer.status === 'awaiting_handover' && transfer.fromUserAcceptedAt && transfer.toUserAcceptedAt) {
      const now = new Date();
      await db.tool.update({
        where: { id: transfer.toolId },
        data: { assignedToId: transfer.toUserId, status: 'checked_out' },
      });
      await db.toolTransaction.create({
        data: {
          toolId: transfer.toolId, type: 'transfer',
          fromUserId: transfer.fromUserId, toUserId: transfer.toUserId,
          notes: `Transfer completed: ${transfer.reason}${transfer.toolConditionAtTransfer ? ` (condition: ${transfer.toolConditionAtTransfer})` : ''}`,
          performedById: transfer.requestedById,
        },
      });
      const completed = await db.toolTransferRequest.update({
        where: { id },
        data: { status: 'transferred', transferredAt: now },
      });

      // Notify both parties of completion
      await notifyUser(transfer.fromUserId, 'tool_transfer_request', 'Tool Transfer Completed',
        `"${transfer.tool.name}" has been successfully transferred to ${transfer.toUser.fullName}`,
        'tool_transfer_request', id);
      await notifyUser(transfer.toUserId, 'tool_transfer_request', 'Tool Transfer Completed',
        `"${transfer.tool.name}" has been successfully transferred to you from ${transfer.fromUser.fullName}`,
        'tool_transfer_request', id);

      return NextResponse.json({ success: true, data: { ...completed, autoCompleted: true } });
    }

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
    const { action, notes, toolConditionAtTransfer } = body;

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
    let updated: any;
    let warnings: string[] = [];

    switch (action) {
      case 'storekeeper_approve': {
        if (transfer.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot approve: status is ${transfer.status}` }, { status: 400 });

        // Validate and store tool condition at transfer
        const resolvedCondition = VALID_CONDITIONS.includes(toolConditionAtTransfer) ? toolConditionAtTransfer : null;
        if (resolvedCondition === 'poor') {
          warnings.push('Tool condition is "poor". Consider maintenance before transfer.');
        }

        // Set status to 'awaiting_handover' instead of directly 'transferred'
        updated = await db.toolTransferRequest.update({
          where: { id },
          data: {
            status: 'awaiting_handover',
            storekeeperApprovedById: session.userId,
            storekeeperApprovedAt: now,
            toolConditionAtTransfer: resolvedCondition,
          },
        });

        // Notify both fromUser and toUser that handover needs to happen
        await notifyUser(transfer.fromUserId, 'tool_transfer_request', 'Tool Transfer Approved — Confirm Handover',
            `Transfer of "${transfer.tool.name}" to ${transfer.toUser.fullName} has been approved. Please confirm you are handing over the tool.`,
            'tool_transfer_request', id, 'maintenance-tools');
        await notifyUser(transfer.toUserId, 'tool_transfer_request', 'Tool Transfer Approved — Confirm Receipt',
            `Transfer of "${transfer.tool.name}" from ${transfer.fromUser.fullName} has been approved. Please confirm you have received the tool.`,
            'tool_transfer_request', id, 'maintenance-tools');
        break;
      }

      case 'storekeeper_reject': {
        if (transfer.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot reject: status is ${transfer.status}` }, { status: 400 });
        const rejectionReason = typeof notes === 'string' && notes.trim() ? notes.trim() : null;
        updated = await db.toolTransferRequest.update({
          where: { id },
          data: { status: 'rejected', storekeeperApprovedById: session.userId, storekeeperApprovedAt: now, rejectionReason },
        });
        await notifyUser(transfer.requestedById, 'tool_transfer_request', 'Tool Transfer Rejected',
            `Transfer of "${transfer.tool.name}" was rejected by store keeper${rejectionReason ? `: ${rejectionReason}` : ''}`,
            'tool_transfer_request', id);
        // Also notify fromUser and toUser
        await notifyUser(transfer.fromUserId, 'tool_transfer_request', 'Tool Transfer Rejected',
            `Transfer of "${transfer.tool.name}" to ${transfer.toUser.fullName} was rejected`,
            'tool_transfer_request', id);
        await notifyUser(transfer.toUserId, 'tool_transfer_request', 'Tool Transfer Rejected',
            `Transfer of "${transfer.tool.name}" from ${transfer.fromUser.fullName} was rejected`,
            'tool_transfer_request', id);
        break;
      }

      case 'from_user_accept': {
        if (transfer.status !== 'awaiting_handover') return NextResponse.json({ success: false, error: `Cannot accept handover: status is ${transfer.status}` }, { status: 400 });
        if (session.userId !== transfer.fromUserId && !session.roles.includes('admin') && !session.roles.includes('store_keeper')) {
          return NextResponse.json({ success: false, error: 'Only the fromUser can confirm handover' }, { status: 403 });
        }

        updated = await db.toolTransferRequest.update({
          where: { id },
          data: { fromUserAcceptedAt: now },
        });

        // Notify toUser that fromUser has confirmed
        await notifyUser(transfer.toUserId, 'tool_transfer_request', 'Tool Handover Confirmed by Sender',
            `${transfer.fromUser.fullName} has confirmed handover of "${transfer.tool.name}". Waiting for your confirmation.`,
            'tool_transfer_request', id, 'maintenance-tools');

        // Auto-complete check: if toUser already accepted
        if (transfer.toUserAcceptedAt) {
          await db.tool.update({
            where: { id: transfer.toolId },
            data: { assignedToId: transfer.toUserId, status: 'checked_out' },
          });
          await db.toolTransaction.create({
            data: {
              toolId: transfer.toolId, type: 'transfer',
              fromUserId: transfer.fromUserId, toUserId: transfer.toUserId,
              notes: `Transfer completed: ${transfer.reason}${transfer.toolConditionAtTransfer ? ` (condition: ${transfer.toolConditionAtTransfer})` : ''}`,
              performedById: transfer.requestedById,
            },
          });
          updated = await db.toolTransferRequest.update({
            where: { id },
            data: { status: 'transferred', transferredAt: now },
          });
          await notifyUser(transfer.fromUserId, 'tool_transfer_request', 'Tool Transfer Completed',
              `"${transfer.tool.name}" has been successfully transferred to ${transfer.toUser.fullName}`,
              'tool_transfer_request', id);
          await notifyUser(transfer.toUserId, 'tool_transfer_request', 'Tool Transfer Completed',
              `"${transfer.tool.name}" has been successfully transferred to you`,
              'tool_transfer_request', id);
        }
        break;
      }

      case 'to_user_accept': {
        if (transfer.status !== 'awaiting_handover') return NextResponse.json({ success: false, error: `Cannot accept receipt: status is ${transfer.status}` }, { status: 400 });
        if (session.userId !== transfer.toUserId && !session.roles.includes('admin') && !session.roles.includes('store_keeper')) {
          return NextResponse.json({ success: false, error: 'Only the toUser can confirm receipt' }, { status: 403 });
        }

        updated = await db.toolTransferRequest.update({
          where: { id },
          data: { toUserAcceptedAt: now },
        });

        // Notify fromUser that toUser has confirmed
        await notifyUser(transfer.fromUserId, 'tool_transfer_request', 'Tool Receipt Confirmed by Receiver',
            `${transfer.toUser.fullName} has confirmed receipt of "${transfer.tool.name}". Waiting for your handover confirmation.`,
            'tool_transfer_request', id, 'maintenance-tools');

        // Auto-complete check: if fromUser already accepted
        if (transfer.fromUserAcceptedAt) {
          await db.tool.update({
            where: { id: transfer.toolId },
            data: { assignedToId: transfer.toUserId, status: 'checked_out' },
          });
          await db.toolTransaction.create({
            data: {
              toolId: transfer.toolId, type: 'transfer',
              fromUserId: transfer.fromUserId, toUserId: transfer.toUserId,
              notes: `Transfer completed: ${transfer.reason}${transfer.toolConditionAtTransfer ? ` (condition: ${transfer.toolConditionAtTransfer})` : ''}`,
              performedById: transfer.requestedById,
            },
          });
          updated = await db.toolTransferRequest.update({
            where: { id },
            data: { status: 'transferred', transferredAt: now },
          });
          await notifyUser(transfer.fromUserId, 'tool_transfer_request', 'Tool Transfer Completed',
              `"${transfer.tool.name}" has been successfully transferred to ${transfer.toUser.fullName}`,
              'tool_transfer_request', id);
          await notifyUser(transfer.toUserId, 'tool_transfer_request', 'Tool Transfer Completed',
              `"${transfer.tool.name}" has been successfully transferred to you`,
              'tool_transfer_request', id);
        }
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    await db.auditLog.create({
      data: { userId: session.userId, action: `tool_transfer_${action}`, entityType: 'tool_transfer_request', entityId: id, newValues: JSON.stringify({ action, status: updated?.status }) },
    });

    return NextResponse.json({ success: true, data: updated, warnings: warnings.length > 0 ? warnings : undefined });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

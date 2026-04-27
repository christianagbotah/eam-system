import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

const VALID_CONDITIONS = ['new', 'good', 'fair', 'poor', 'damaged'];

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
        workOrder: { select: { id: true, woNumber: true, title: true, status: true, assignedSupervisorId: true, plannerId: true, assignedSupervisor: { select: { id: true, fullName: true } } } },
        tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, location: true, condition: true } },
      },
    });
    if (!toolReq) return NextResponse.json({ success: false, error: 'Tool request not found' }, { status: 404 });

    // Add isOverdue flag
    const overdueThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isOverdue = toolReq.status === 'pending' && toolReq.createdAt < overdueThreshold;

    return NextResponse.json({ success: true, data: { ...toolReq, isOverdue } });
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
    const { action, notes, toolConditionAtReturn } = body;

    const toolReq = await db.repairToolRequest.findUnique({
      where: { id },
      include: {
        workOrder: { select: { id: true, woNumber: true, title: true, assignedSupervisorId: true, plannerId: true } },
        requestedBy: { select: { id: true, fullName: true } },
        tool: true,
      },
    });
    if (!toolReq) return NextResponse.json({ success: false, error: 'Tool request not found' }, { status: 404 });

    const now = new Date();
    let updated: any;
    let warnings: string[] = [];

    switch (action) {
      case 'supervisor_approve': {
        if (toolReq.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot approve: status is ${toolReq.status}` }, { status: 400 });

        // Check tool availability if toolId exists
        if (toolReq.toolId && toolReq.tool) {
          if (toolReq.tool.status !== 'available') {
            return NextResponse.json({ success: false, error: `Tool "${toolReq.tool.name}" is not available (status: ${toolReq.tool.status}). Cannot approve.` }, { status: 400 });
          }
          // Capture tool condition at approval time
          await db.repairToolRequest.update({
            where: { id },
            data: { toolConditionAtIssue: toolReq.tool.condition },
          });
        }

        updated = await db.repairToolRequest.update({
          where: { id },
          data: { status: 'supervisor_approved', supervisorApprovedById: session.userId, supervisorApprovedAt: now },
        });

        const storeKeepers = await db.user.findMany({ where: { userRoles: { some: { role: { slug: 'store_keeper' } } }, status: 'active' }, select: { id: true } });
        for (const sk of storeKeepers) {
          await notifyUser(sk.id, 'repair_tool_request', 'Tool Request Awaiting Store Approval',
              `"${toolReq.toolName}" approved by supervisor for WO ${toolReq.workOrder.woNumber}${toolReq.urgency !== 'normal' ? ` [${toolReq.urgency.toUpperCase()}]` : ''}`,
              'repair_tool_request', id);
        }
        await notifyUser(toolReq.requestedById, 'repair_tool_request', 'Tool Request Approved',
            `Your request for "${toolReq.toolName}" was approved by supervisor`,
            'repair_tool_request', id);
        break;
      }

      case 'supervisor_reject': {
        if (toolReq.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot reject: status is ${toolReq.status}` }, { status: 400 });
        const rejectionReason = typeof notes === 'string' && notes.trim() ? notes.trim() : null;
        updated = await db.repairToolRequest.update({
          where: { id },
          data: { status: 'rejected', supervisorApprovedById: session.userId, supervisorApprovedAt: now, rejectionReason },
        });
        await notifyUser(toolReq.requestedById, 'repair_tool_request', 'Tool Request Rejected',
            `Your request for "${toolReq.toolName}" was rejected by supervisor${rejectionReason ? `: ${rejectionReason}` : ''}`,
            'repair_tool_request', id);
        break;
      }

      case 'storekeeper_approve': {
        if (toolReq.status !== 'supervisor_approved') return NextResponse.json({ success: false, error: `Cannot approve: status is ${toolReq.status}` }, { status: 400 });

        // Reserve the tool temporarily: set status to 'in_repair'
        if (toolReq.toolId && toolReq.tool) {
          if (toolReq.tool.status !== 'available') {
            return NextResponse.json({ success: false, error: `Tool "${toolReq.tool.name}" is no longer available (status: ${toolReq.tool.status})` }, { status: 400 });
          }
          await db.tool.update({
            where: { id: toolReq.toolId },
            data: { status: 'in_repair' },
          });
        }

        updated = await db.repairToolRequest.update({
          where: { id },
          data: { status: 'storekeeper_approved', storekeeperApprovedById: session.userId, storekeeperApprovedAt: now },
        });

        // Notify requester
        await notifyUser(toolReq.requestedById, 'repair_tool_request', 'Tool Ready for Pickup',
            `"${toolReq.toolName}" is approved and ready for issuance`,
            'repair_tool_request', id);
        break;
      }

      case 'storekeeper_reject': {
        if (toolReq.status !== 'supervisor_approved') return NextResponse.json({ success: false, error: `Cannot reject: status is ${toolReq.status}` }, { status: 400 });
        const rejectionReason = typeof notes === 'string' && notes.trim() ? notes.trim() : null;

        // Release the tool if it was reserved
        if (toolReq.toolId && toolReq.tool && toolReq.tool.status === 'in_repair') {
          await db.tool.update({ where: { id: toolReq.toolId }, data: { status: 'available' } });
        }

        updated = await db.repairToolRequest.update({
          where: { id },
          data: { status: 'rejected', storekeeperApprovedById: session.userId, storekeeperApprovedAt: now, rejectionReason },
        });
        await notifyUser(toolReq.requestedById, 'repair_tool_request', 'Tool Request Rejected by Store',
            `"${toolReq.toolName}" was rejected by store keeper${rejectionReason ? `: ${rejectionReason}` : ''}`,
            'repair_tool_request', id);
        break;
      }

      case 'issue': {
        if (toolReq.status !== 'storekeeper_approved') return NextResponse.json({ success: false, error: `Cannot issue: status is ${toolReq.status}` }, { status: 400 });

        // Set tool status to checked_out, assign to requester
        if (toolReq.toolId) {
          const tool = toolReq.tool;
          if (!tool || (tool.status !== 'in_repair' && tool.status !== 'available')) {
            return NextResponse.json({ success: false, error: `Tool is not available for issue (current status: ${tool?.status})` }, { status: 400 });
          }

          // Store tool condition at issue if not already captured
          const conditionAtIssue = toolReq.toolConditionAtIssue || tool.condition;

          await db.tool.update({
            where: { id: toolReq.toolId },
            data: {
              status: 'checked_out',
              assignedToId: toolReq.requestedById,
              checkedOutAt: now,
            },
          });
          await db.toolTransaction.create({
            data: {
              toolId: toolReq.toolId,
              type: 'checkout',
              toUserId: toolReq.requestedById,
              notes: `Issued for WO ${toolReq.workOrder.woNumber} (condition: ${conditionAtIssue})`,
              performedById: session.userId,
            },
          });

          // Update condition at issue on the request
          await db.repairToolRequest.update({
            where: { id },
            data: { toolConditionAtIssue: conditionAtIssue },
          });
        }

        updated = await db.repairToolRequest.update({
          where: { id },
          data: { status: 'issued', issuedById: session.userId, issuedAt: now },
        });

        // Notify requester
        await notifyUser(toolReq.requestedById, 'repair_tool_request', 'Tool Issued',
            `"${toolReq.toolName}" has been issued to you for WO ${toolReq.workOrder.woNumber}`,
            'repair_tool_request', id);

        // Notify WO planner on issue
        if (toolReq.workOrder.plannerId && toolReq.workOrder.plannerId !== toolReq.requestedById) {
          await notifyUser(toolReq.workOrder.plannerId, 'repair_tool_request', 'Tool Issued for WO',
              `"${toolReq.toolName}" issued to ${toolReq.requestedBy.fullName} for WO ${toolReq.workOrder.woNumber}`,
              'repair_tool_request', id, 'maintenance-work-orders');
        }
        break;
      }

      case 'return': {
        if (toolReq.status !== 'issued') return NextResponse.json({ success: false, error: `Cannot return: status is ${toolReq.status}` }, { status: 400 });

        const resolvedReturnCondition = VALID_CONDITIONS.includes(toolConditionAtReturn) ? toolConditionAtReturn : (toolReq.tool?.condition || 'good');

        if (toolReq.toolId) {
          // Determine target tool status based on return condition
          const previousCondition = toolReq.toolConditionAtIssue || toolReq.tool?.condition || 'good';
          if (resolvedReturnCondition === 'poor' || resolvedReturnCondition === 'damaged') {
            warnings.push(`Tool condition is "${resolvedReturnCondition}". Tool has been automatically flagged for repair.`);
          } else if (
            (previousCondition === 'new' && resolvedReturnCondition === 'fair') ||
            (previousCondition === 'good' && resolvedReturnCondition === 'fair')
          ) {
            warnings.push(`Tool condition has changed from "${previousCondition}" to "${resolvedReturnCondition}".`);
          }

          const toolStatus = (resolvedReturnCondition === 'poor' || resolvedReturnCondition === 'damaged') ? 'in_repair' : 'available';
          await db.tool.update({
            where: { id: toolReq.toolId },
            data: { status: toolStatus, assignedToId: null, checkedOutAt: null, condition: resolvedReturnCondition },
          });
          await db.toolTransaction.create({
            data: {
              toolId: toolReq.toolId,
              type: 'return',
              fromUserId: toolReq.requestedById,
              notes: `Returned from WO ${toolReq.workOrder.woNumber} (condition: ${resolvedReturnCondition})`,
              performedById: session.userId,
            },
          });
        }

        updated = await db.repairToolRequest.update({
          where: { id },
          data: { status: 'returned', returnedById: session.userId, returnedAt: now, toolConditionAtReturn: resolvedReturnCondition },
        });

        // Notify WO planner on return
        if (toolReq.workOrder.plannerId && toolReq.workOrder.plannerId !== toolReq.requestedById) {
          await notifyUser(toolReq.workOrder.plannerId, 'repair_tool_request', 'Tool Returned from WO',
              `"${toolReq.toolName}" returned by ${toolReq.requestedBy.fullName} from WO ${toolReq.workOrder.woNumber} (condition: ${resolvedReturnCondition})`,
              'repair_tool_request', id, 'maintenance-work-orders');
        }
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    await db.auditLog.create({
      data: { userId: session.userId, action: `tool_request_${action}`, entityType: 'repair_tool_request', entityId: id, newValues: JSON.stringify({ action, status: updated?.status }) },
    });

    return NextResponse.json({ success: true, data: updated, warnings: warnings.length > 0 ? warnings : undefined });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

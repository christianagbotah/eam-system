import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const VALID_CONDITIONS = ['new', 'good', 'fair', 'poor'];

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
          await db.notification.create({
            data: { userId: sk.id, type: 'repair_tool_request', title: 'Tool Request Awaiting Store Approval',
              message: `"${toolReq.toolName}" approved by supervisor for WO ${toolReq.workOrder.woNumber}${toolReq.urgency !== 'normal' ? ` [${toolReq.urgency.toUpperCase()}]` : ''}`,
              entityType: 'repair_tool_request', entityId: id },
          });
        }
        await db.notification.create({
          data: { userId: toolReq.requestedById, type: 'repair_tool_request', title: 'Tool Request Approved',
            message: `Your request for "${toolReq.toolName}" was approved by supervisor`,
            entityType: 'repair_tool_request', entityId: id },
        });
        break;
      }

      case 'supervisor_reject': {
        if (toolReq.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot reject: status is ${toolReq.status}` }, { status: 400 });
        const rejectionReason = typeof notes === 'string' && notes.trim() ? notes.trim() : null;
        updated = await db.repairToolRequest.update({
          where: { id },
          data: { status: 'rejected', supervisorApprovedById: session.userId, supervisorApprovedAt: now, rejectionReason },
        });
        await db.notification.create({
          data: { userId: toolReq.requestedById, type: 'repair_tool_request', title: 'Tool Request Rejected',
            message: `Your request for "${toolReq.toolName}" was rejected by supervisor${rejectionReason ? `: ${rejectionReason}` : ''}`,
            entityType: 'repair_tool_request', entityId: id },
        });
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
        await db.notification.create({
          data: { userId: toolReq.requestedById, type: 'repair_tool_request', title: 'Tool Ready for Pickup',
            message: `"${toolReq.toolName}" is approved and ready for issuance`,
            entityType: 'repair_tool_request', entityId: id },
        });
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
        await db.notification.create({
          data: { userId: toolReq.requestedById, type: 'repair_tool_request', title: 'Tool Request Rejected by Store',
            message: `"${toolReq.toolName}" was rejected by store keeper${rejectionReason ? `: ${rejectionReason}` : ''}`,
            entityType: 'repair_tool_request', entityId: id },
        });
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
        await db.notification.create({
          data: { userId: toolReq.requestedById, type: 'repair_tool_request', title: 'Tool Issued',
            message: `"${toolReq.toolName}" has been issued to you for WO ${toolReq.workOrder.woNumber}`,
            entityType: 'repair_tool_request', entityId: id },
        });

        // Notify WO planner on issue
        if (toolReq.workOrder.plannerId && toolReq.workOrder.plannerId !== toolReq.requestedById) {
          await db.notification.create({
            data: { userId: toolReq.workOrder.plannerId, type: 'repair_tool_request', title: 'Tool Issued for WO',
              message: `"${toolReq.toolName}" issued to ${toolReq.requestedBy.fullName} for WO ${toolReq.workOrder.woNumber}`,
              entityType: 'repair_tool_request', entityId: id, actionUrl: 'maintenance-work-orders' },
          });
        }
        break;
      }

      case 'return': {
        if (toolReq.status !== 'issued') return NextResponse.json({ success: false, error: `Cannot return: status is ${toolReq.status}` }, { status: 400 });

        const resolvedReturnCondition = VALID_CONDITIONS.includes(toolConditionAtReturn) ? toolConditionAtReturn : (toolReq.tool?.condition || 'good');

        if (toolReq.toolId) {
          // Verify condition hasn't degraded — just store the current condition
          const previousCondition = toolReq.toolConditionAtIssue || toolReq.tool?.condition || 'good';
          if (resolvedReturnCondition === 'poor' && previousCondition !== 'poor') {
            warnings.push(`Tool condition has degraded from "${previousCondition}" to "poor". This tool may need maintenance.`);
          } else if (
            (previousCondition === 'new' && resolvedReturnCondition === 'fair') ||
            (previousCondition === 'good' && resolvedReturnCondition === 'fair')
          ) {
            warnings.push(`Tool condition has changed from "${previousCondition}" to "${resolvedReturnCondition}".`);
          }

          await db.tool.update({
            where: { id: toolReq.toolId },
            data: { status: 'available', assignedToId: null, checkedOutAt: null, condition: resolvedReturnCondition },
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
          await db.notification.create({
            data: { userId: toolReq.workOrder.plannerId, type: 'repair_tool_request', title: 'Tool Returned from WO',
              message: `"${toolReq.toolName}" returned by ${toolReq.requestedBy.fullName} from WO ${toolReq.workOrder.woNumber} (condition: ${resolvedReturnCondition})`,
              entityType: 'repair_tool_request', entityId: id, actionUrl: 'maintenance-work-orders' },
          });
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

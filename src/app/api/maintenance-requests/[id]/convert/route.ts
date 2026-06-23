import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { executeTransition } from '@/lib/state-machine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['maintenance_requests.convert_to_wo'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      title,
      priority,
      workOrderType,
      tradeActivity,
      technicalDescription,
      assignmentType,
      assignedTo,
      teamLeaderId,
      teamMembers,
      assignedSupervisorId,
      failureDescription,
      causeDescription,
      actionDescription,
      estimatedHours,
      plannedStart,
      plannedEnd,
      deliveryDateRequired,
      safetyNotes,
      ppeRequired,
      notes,
      requiredParts,
      requiredTools,
    } = body;

    const mr = await db.maintenanceRequest.findUnique({ where: { id } });
    if (!mr) {
      return NextResponse.json({ success: false, error: 'Maintenance request not found' }, { status: 404 });
    }

    if (mr.workOrderId) {
      const linkedWO = await db.workOrder.findUnique({ where: { id: mr.workOrderId } });
      if (linkedWO) {
        return NextResponse.json(
          { success: false, error: `This request has already been converted to work order ${linkedWO.woNumber}` },
          { status: 400 }
        );
      }
      // Stale link — clear it inside the transaction below
    }

    // Also check if a work order already references this MR (data consistency fallback)
    const existingWO = await db.workOrder.findFirst({ where: { maintenanceRequestId: id } });
    if (existingWO) {
      // Repair the link
      await db.maintenanceRequest.update({
        where: { id },
        data: { workOrderId: existingWO.id },
      });
      return NextResponse.json(
        { success: false, error: `This request was already converted to work order ${existingWO.woNumber}`, existingWOId: existingWO.id },
        { status: 409 }
      );
    }

    // Validate team members if provided
    if (teamMembers && Array.isArray(teamMembers)) {
      for (const member of teamMembers) {
        if (!member.userId || !member.role) {
          return NextResponse.json(
            { success: false, error: 'Each team member must have userId and role' },
            { status: 400 }
          );
        }
      }
    }

    // Generate work order number
    const now = new Date();
    const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastWO = await db.workOrder.findFirst({
      where: { woNumber: { startsWith: `WO-${monthStr}` } },
      orderBy: { woNumber: 'desc' },
    });
    let seq = 1;
    if (lastWO) {
      const parts = lastWO.woNumber.split('-');
      seq = parseInt(parts[2] || '0', 10) + 1;
    }
    const woNumber = `WO-${monthStr}-${String(seq).padStart(4, '0')}`;

    // Determine initial WO status: "assigned" if assignee/team provided, otherwise "approved"
    const hasAssignment = assignedTo || (teamMembers && teamMembers.length > 0);
    const woStatus = hasAssignment ? 'assigned' : 'approved';

    // ── Execute all DB writes inside a single transaction ──
    const wo = await db.$transaction(async (tx) => {
      // Clear stale workOrderId if present
      if (mr.workOrderId) {
        await tx.maintenanceRequest.update({ where: { id }, data: { workOrderId: null } });
      }

      // Create the work order
      const workOrder = await tx.workOrder.create({
        data: {
          woNumber,
          title: title || `WO for ${mr.title}`,
          description: mr.description,
          type: workOrderType || 'corrective',
          priority: priority || mr.priority || 'medium',
          status: woStatus,
          maintenanceRequestId: mr.id,
          assetId: mr.assetId,
          departmentId: mr.departmentId,
          plantId: mr.plantId,
          estimatedHours: estimatedHours ?? mr.estimatedHours,
          plannedStart: plannedStart ? new Date(plannedStart) : mr.plannedStart,
          plannedEnd: deliveryDateRequired ? new Date(deliveryDateRequired) : (plannedEnd ? new Date(plannedEnd) : mr.plannedEnd),
          plannerId: session.userId,
          assignedTo: assignedTo || null,
          teamLeaderId: teamLeaderId || null,
          assignedSupervisorId: assignedSupervisorId || null,
          assignmentType: assignmentType || (assignedTo ? 'direct' : null),
          assignedBy: session.userId,
          failureDescription: failureDescription || null,
          causeDescription: causeDescription || null,
          actionDescription: actionDescription || null,
          tradeActivity: tradeActivity || null,
          safetyNotes: safetyNotes || null,
          ppeRequired: ppeRequired || null,
          notes: notes || null,
        },
        include: {
          assignee: { select: { id: true, fullName: true, username: true } },
          teamLeader: { select: { id: true, fullName: true, username: true } },
          assignedSupervisor: { select: { id: true, fullName: true, username: true } },
          planner: { select: { id: true, fullName: true, username: true } },
          maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
        },
      });

      // Create team member records
      if (teamMembers && teamMembers.length > 0) {
        const teamMemberData = teamMembers.map((member: { userId: string; role: string }) => {
          const isTeamLeader = member.userId === teamLeaderId;
          return {
            workOrderId: workOrder.id,
            userId: member.userId,
            role: isTeamLeader ? 'team_leader' : member.role,
            accessLevel: isTeamLeader ? 'full' : 'read_only',
            assignedAt: now,
          };
        });
        await tx.workOrderTeamMember.createMany({ data: teamMemberData });
      }

      // If assignedTo is not in teamMembers, add them
      if (assignedTo && !(teamMembers && teamMembers.some((m: { userId: string }) => m.userId === assignedTo))) {
        const isTeamLeader = assignedTo === teamLeaderId;
        await tx.workOrderTeamMember.create({
          data: {
            workOrderId: workOrder.id,
            userId: assignedTo,
            role: isTeamLeader ? 'team_leader' : 'assistant',
            accessLevel: isTeamLeader ? 'full' : 'read_only',
            assignedAt: now,
          },
        });
      }

      // Create required parts
      if (requiredParts && Array.isArray(requiredParts) && requiredParts.length > 0) {
        for (const partId of requiredParts) {
          const part = await tx.inventoryItem.findUnique({ where: { id: partId } });
          if (part) {
            await tx.workOrderMaterial.create({
              data: {
                workOrderId: workOrder.id,
                itemId: part.id,
                itemName: part.name,
                quantity: 0,
                unitCost: part.unitCost || 0,
                totalCost: 0,
                status: 'requested',
                requestedBy: session.userId,
              },
            });
          }
        }
      }

      // Create required tools
      if (requiredTools && Array.isArray(requiredTools) && requiredTools.length > 0) {
        for (const toolId of requiredTools) {
          const tool = await tx.tool.findUnique({ where: { id: toolId } });
          if (tool) {
            await tx.workOrderMaterial.create({
              data: {
                workOrderId: workOrder.id,
                itemName: tool.name,
                quantity: 1,
                unitCost: 0,
                totalCost: 0,
                status: 'requested',
                requestedBy: session.userId,
              },
            });
          }
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'update',
          entityType: 'maintenance_request',
          entityId: id,
          oldValues: JSON.stringify({}),
          newValues: JSON.stringify({
            workOrderId: workOrder.id,
            woNumber: workOrder.woNumber,
            assignedTo: assignedTo || null,
            teamLeaderId: teamLeaderId || null,
            teamMembersCount: teamMembers?.length || 0,
            assignmentType: assignmentType || null,
          }),
        },
      });

      return workOrder;
    }, { timeout: 30000 });

    // ── Post-transaction: state machine transition ──
    const result = await executeTransition(
      'maintenance_request',
      id,
      'converted',
      session,
      {
        extraData: {
          workOrderId: wo.id,
          workflowStatus: 'work_order_created',
          assignedPlannerId: session.userId,
        },
      },
    );

    if (!result.success) {
      // State machine failed — the WO was created inside the transaction, so it's persisted.
      // Return success for the WO creation but warn about the status transition.
      return NextResponse.json({
        success: true,
        data: wo,
        warning: `Work order created but status transition failed: ${result.error}. The MR status may need manual update.`,
      }, { status: 201 });
    }

    // ── Notifications (non-critical, fire-and-forget) ──
    const notifyAsync = (userId: string, type: string, title: string, body: string, entityType: string, entityId: string, path: string, opts?: Record<string, unknown>) =>
      notifyUser(userId, type, title, body, entityType, entityId, path, opts).catch(() => {});

    if (mr.requestedBy && mr.requestedBy !== session.userId) {
      await notifyAsync(mr.requestedBy, 'mr_converted', 'MR Converted to Work Order',
        `Your request has been converted to WO ${wo.woNumber} by ${session.fullName}`,
        'work_order', wo.id, `wo-detail?id=${wo.id}`);
    }
    if (teamLeaderId && teamLeaderId !== session.userId) {
      await notifyAsync(teamLeaderId, 'wo_assigned', 'Work Order Team Lead Assignment',
        `${session.fullName} assigned you as team leader for ${wo.woNumber}: "${wo.title}"`,
        'work_order', wo.id, `wo-detail?id=${wo.id}`, { forceSms: true });
    }
    if (assignedTo && assignedTo !== session.userId && assignedTo !== teamLeaderId) {
      await notifyAsync(assignedTo, 'wo_assigned', 'Work Order Assigned',
        `${session.fullName} assigned ${wo.woNumber} to you: "${wo.title}"`,
        'work_order', wo.id, `wo-detail?id=${wo.id}`, { forceSms: true });
    }
    if (teamMembers && teamMembers.length > 0) {
      for (const member of teamMembers) {
        if (member.userId !== session.userId && member.userId !== assignedTo && member.userId !== teamLeaderId) {
          await notifyAsync(member.userId, 'wo_assigned', 'Work Order Team Assignment',
            `${session.fullName} assigned you to the team for ${wo.woNumber}: "${wo.title}"`,
            'work_order', wo.id, `wo-detail?id=${wo.id}`, { forceSms: true });
        }
      }
    }
    if (assignedSupervisorId && assignedSupervisorId !== session.userId) {
      await notifyAsync(assignedSupervisorId, 'wo_assigned', 'Work Order Pending Your Review',
        `${session.fullName} created ${wo.woNumber} and assigned it to your team for review`,
        'work_order', wo.id, `wo-detail?id=${wo.id}`, { forceSms: true });
    }

    return NextResponse.json({ success: true, data: wo }, { status: 201 });
  } catch (error: unknown) {
    // Handle race condition: another request already converted this MR
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      const existingWO = await db.workOrder.findFirst({ where: { maintenanceRequestId: (await params).id } });
      const woRef = existingWO ? existingWO.woNumber : 'an existing work order';
      return NextResponse.json(
        { success: false, error: `This request has already been converted to ${woRef}` },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to convert maintenance request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
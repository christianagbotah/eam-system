import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { getPlantScope, applyPlantScope } from '@/lib/plant-scope';

// Helper: generate WO number WO-YYYYMM-NNNN
async function generateWoNumber(): Promise<string> {
  const now = new Date();
  const prefix = `WO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.workOrder.findFirst({
    where: { woNumber: { startsWith: prefix } },
    orderBy: { woNumber: 'desc' },
    select: { woNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.woNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.view') && !hasPermission(session, 'work_orders.view_own') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search');

    // Resolve plant scope (validates X-Plant-ID against user's plant access)
    const plantScope = await getPlantScope(request, session);

    // Build where clause with role-based filtering
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (search) {
      where.title = { contains: search };
    }

    const hasViewAll = hasPermission(session, 'work_orders.view') || hasPermission(session, 'work_orders.view_all') || isAdmin(session);

    if (!hasViewAll) {
      // Users with only view_own see WOs assigned to them or where they are team members
      const teamWoIds = await db.workOrderTeamMember.findMany({
        where: { userId: session.userId },
        select: { workOrderId: true },
      });
      const teamIds = teamWoIds.map(t => t.workOrderId);
      if (teamIds.length > 0) {
        where.OR = [
          { assignedTo: session.userId },
          { id: { in: teamIds } },
        ];
      } else {
        where.assignedTo = session.userId;
      }
    } else if (!isAdmin(session)) {
      // Technicians get scoped view even with view_all
      if (session.roles.includes('maintenance_technician')) {
        const teamWoIds = await db.workOrderTeamMember.findMany({
          where: { userId: session.userId },
          select: { workOrderId: true },
        });
        const teamIds = teamWoIds.map(t => t.workOrderId);
        if (teamIds.length > 0) {
          where.OR = [
            { assignedTo: session.userId },
            { id: { in: teamIds } },
          ];
        } else {
          where.assignedTo = session.userId;
        }
      }
      // Planners, supervisors, and managers see all
    }

    // Only allow assignedTo filter for users with view_all (prevents view_own bypass)
    if (assignedTo && hasViewAll) {
      where.assignedTo = assignedTo;
    }

    // Apply plant scoping filter
    if (plantScope) {
      applyPlantScope(where, plantScope);
    }

    const [workOrders, total] = await Promise.all([
      db.workOrder.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          assignee: { select: { id: true, fullName: true, username: true } },
          teamLeader: { select: { id: true, fullName: true, username: true } },
          assignedSupervisor: { select: { id: true, fullName: true, username: true } },
          assigner: { select: { id: true, fullName: true, username: true } },
          planner: { select: { id: true, fullName: true, username: true } },
          maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
          pmSchedule: { select: { id: true, title: true, frequencyType: true, frequencyValue: true } },
          teamMembers: {
            include: { user: { select: { id: true, fullName: true } } },
            orderBy: { assignedAt: 'asc' },
          },
          timeLogs: {
            include: {
              user: { select: { id: true, fullName: true, username: true } },
            },
            orderBy: { timestamp: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.workOrder.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: workOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      priority,
      assetId,
      assetName,
      departmentId,
      plantId,
      estimatedHours,
      plannedStart,
      plannedEnd,
      maintenanceRequestId,
      notes,
      failureDescription,
      causeDescription,
      actionDescription,
      // Enhanced fields (matching convert-to-WO capabilities)
      tradeActivity,
      technicalDescription,
      deliveryDateRequired,
      safetyNotes,
      ppeRequired,
      assignmentType,
      assignedTo,
      teamLeaderId,
      teamMembers,
      assignedSupervisorId,
      requiredParts,
      requiredTools,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const woNumber = await generateWoNumber();

    // Resolve plantId
    let resolvedPlantId = plantId;
    if (!resolvedPlantId) {
      const userPlant = await db.userPlant.findFirst({
        where: { userId: session.userId, isPrimary: true },
      });
      resolvedPlantId = userPlant?.plantId ?? null;
    }

    // Determine initial WO status: "assigned" if assignee/team provided, otherwise "draft"
    const hasAssignment = assignedTo || (teamMembers && teamMembers.length > 0);
    const woStatus = hasAssignment ? 'assigned' : 'draft';

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

    const wo = await db.workOrder.create({
      data: {
        woNumber,
        title,
        description: description || technicalDescription || null,
        type: type || 'corrective',
        priority: priority || 'medium',
        assetId: assetId || null,
        assetName: assetName || null,
        departmentId: departmentId || null,
        plantId: resolvedPlantId,
        estimatedHours: estimatedHours || null,
        plannedStart: plannedStart ? new Date(plannedStart) : null,
        plannedEnd: plannedEnd || (deliveryDateRequired ? new Date(deliveryDateRequired) : null),
        maintenanceRequestId: maintenanceRequestId || null,
        notes: notes || null,
        failureDescription: failureDescription || null,
        causeDescription: causeDescription || null,
        actionDescription: actionDescription || null,
        // Enhanced fields
        tradeActivity: tradeActivity || null,
        safetyNotes: safetyNotes || null,
        ppeRequired: ppeRequired || null,
        status: woStatus,
        plannerId: session.userId,
        assignedTo: assignedTo || null,
        teamLeaderId: teamLeaderId || null,
        assignedSupervisorId: assignedSupervisorId || null,
        assignmentType: assignmentType || (assignedTo ? 'direct' : null),
        assignedBy: session.userId,
      },
      include: {
        assignee: { select: { id: true, fullName: true } },
        planner: { select: { id: true, fullName: true } },
        teamLeader: { select: { id: true, fullName: true } },
        assignedSupervisor: { select: { id: true, fullName: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    // Create team member records if provided
    if (teamMembers && teamMembers.length > 0) {
      const now = new Date();
      const teamMemberData = teamMembers.map((member: { userId: string; role: string }) => {
        const isTeamLeader = member.userId === teamLeaderId;
        return {
          workOrderId: wo.id,
          userId: member.userId,
          role: isTeamLeader ? 'team_leader' : member.role,
          accessLevel: isTeamLeader ? 'full' : 'read_only',
          assignedAt: now,
        };
      });

      await db.workOrderTeamMember.createMany({ data: teamMemberData });
    }

    // Ensure assignedTo is a team member if not already in teamMembers
    if (assignedTo && !(teamMembers && teamMembers.some((m: { userId: string }) => m.userId === assignedTo))) {
      const isTeamLeader = assignedTo === teamLeaderId;
      const existingMember = await db.workOrderTeamMember.findFirst({
        where: { workOrderId: wo.id, userId: assignedTo },
      });
      if (!existingMember) {
        await db.workOrderTeamMember.create({
          data: {
            workOrderId: wo.id,
            userId: assignedTo,
            role: isTeamLeader ? 'team_leader' : 'assistant',
            accessLevel: isTeamLeader ? 'full' : 'read_only',
            assignedAt: new Date(),
          },
        });
      }
    }

    // Create required parts as material requests if provided
    if (requiredParts && Array.isArray(requiredParts) && requiredParts.length > 0) {
      for (const partId of requiredParts) {
        const part = await db.inventoryItem.findUnique({ where: { id: partId } });
        if (part) {
          await db.workOrderMaterial.create({
            data: {
              workOrderId: wo.id,
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

    // Create required tools as material references if provided
    if (requiredTools && Array.isArray(requiredTools) && requiredTools.length > 0) {
      for (const toolId of requiredTools) {
        const tool = await db.tool.findUnique({ where: { id: toolId } });
        if (tool) {
          await db.workOrderMaterial.create({
            data: {
              workOrderId: wo.id,
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

    // If created from a maintenance request, update the MR status
    if (maintenanceRequestId) {
      await db.maintenanceRequest.update({
        where: { id: maintenanceRequestId },
        data: {
          status: 'converted',
          workflowStatus: 'work_order_created',
          assignedPlannerId: session.userId,
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'work_order',
        entityId: wo.id,
        newValues: JSON.stringify({ woNumber, title, type, priority }),
      },
    });

    return NextResponse.json({ success: true, data: wo }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

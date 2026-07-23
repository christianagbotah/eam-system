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
      componentIds,
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
        workOrderComponents: {
          include: {
            componentRegistry: { select: { id: true, name: true, componentCode: true, componentType: true, criticality: true } },
          },
        },
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

    // ── Store planner-suggested parts & tools ──
    // Support both legacy format (array of IDs) and new format (array of objects with qty)
    const suggestedPartsArr: Array<{ id: string; itemId: string; itemName: string; itemCode: string; quantity: number; unit: string; notes?: string }> = [];
    const suggestedToolsArr: Array<{ id: string; toolId: string; toolName: string; toolCode: string; quantity: number; notes?: string }> = [];

    if (requiredParts && Array.isArray(requiredParts) && requiredParts.length > 0) {
      for (const part of requiredParts) {
        // New format: { itemId, quantity, unit, notes } or { itemId, quantity, ... }
        if (typeof part === 'object' && part.itemId) {
          const invItem = await db.inventoryItem.findUnique({ where: { id: part.itemId } });
          const entry = {
            id: crypto.randomUUID(),
            itemId: part.itemId,
            itemName: invItem?.name || part.itemName || 'Unknown Part',
            itemCode: invItem?.itemCode || part.itemCode || '',
            quantity: part.quantity || 1,
            unit: part.unit || invItem?.unit || 'each',
            notes: part.notes || '',
          };
          suggestedPartsArr.push(entry);

          // Also create a RepairMaterialRequest so store keeper can see it in the pipeline
          await db.repairMaterialRequest.create({
            data: {
              workOrderId: wo.id,
              itemId: part.itemId,
              itemName: entry.itemName,
              quantityRequested: entry.quantity,
              quantityApproved: 0,
              unit: entry.unit,
              unitCost: invItem?.unitCost || 0,
              estimatedCost: (invItem?.unitCost || 0) * entry.quantity,
              urgency: (part as Record<string, unknown>).urgency as string || 'normal',
              reason: 'Planner suggested material for work order',
              notes: part.notes || `Suggested by planner during WO creation`,
              plantId: resolvedPlantId,
              source: 'planner_suggested',
              status: 'pending',
              requestedById: session.userId,
            },
          });
        }
        // Legacy format: just an ID string
        else if (typeof part === 'string') {
          const invItem = await db.inventoryItem.findUnique({ where: { id: part } });
          if (invItem) {
            const entry = {
              id: crypto.randomUUID(),
              itemId: invItem.id,
              itemName: invItem.name,
              itemCode: invItem.itemCode || '',
              quantity: 1,
              unit: invItem.unit || 'each',
              notes: '',
            };
            suggestedPartsArr.push(entry);

            await db.repairMaterialRequest.create({
              data: {
                workOrderId: wo.id,
                itemId: invItem.id,
                itemName: invItem.name,
                quantityRequested: 1,
                unit: invItem.unit || 'each',
                unitCost: invItem.unitCost || 0,
                estimatedCost: invItem.unitCost || 0,
                reason: 'Planner suggested material for work order',
                plantId: resolvedPlantId,
                source: 'planner_suggested',
                status: 'pending',
                requestedById: session.userId,
              },
            });
          }
        }
      }
    }

    if (requiredTools && Array.isArray(requiredTools) && requiredTools.length > 0) {
      for (const tool of requiredTools) {
        // New format: { toolId, quantity, notes }
        if (typeof tool === 'object' && tool.toolId) {
          const toolRec = await db.tool.findUnique({ where: { id: tool.toolId } });
          const entry = {
            id: crypto.randomUUID(),
            toolId: tool.toolId,
            toolName: toolRec?.name || tool.toolName || 'Unknown Tool',
            toolCode: toolRec?.toolCode || tool.toolCode || '',
            quantity: tool.quantity || 1,
            notes: tool.notes || '',
          };
          suggestedToolsArr.push(entry);

          await db.repairToolRequest.create({
            data: {
              workOrderId: wo.id,
              toolId: tool.toolId,
              toolName: entry.toolName,
              reason: 'Planner suggested tool for work order',
              notes: tool.notes || `Suggested by planner during WO creation`,
              plantId: resolvedPlantId,
              source: 'planner_suggested',
              status: 'pending',
              urgency: 'normal',
              requestedById: session.userId,
            },
          });
        }
        // Legacy format: just an ID string
        else if (typeof tool === 'string') {
          const toolRec = await db.tool.findUnique({ where: { id: tool } });
          if (toolRec) {
            const entry = {
              id: crypto.randomUUID(),
              toolId: toolRec.id,
              toolName: toolRec.name,
              toolCode: toolRec.toolCode || '',
              quantity: 1,
              notes: '',
            };
            suggestedToolsArr.push(entry);

            await db.repairToolRequest.create({
              data: {
                workOrderId: wo.id,
                toolId: toolRec.id,
                toolName: toolRec.name,
                reason: 'Planner suggested tool for work order',
                plantId: resolvedPlantId,
                source: 'planner_suggested',
                status: 'pending',
                urgency: 'normal',
                requestedById: session.userId,
              },
            });
          }
        }
      }
    }

    // Store suggested parts/tools on the WO record
    if (suggestedPartsArr.length > 0 || suggestedToolsArr.length > 0) {
      await db.workOrder.update({
        where: { id: wo.id },
        data: {
          suggestedParts: JSON.stringify(suggestedPartsArr),
          suggestedTools: JSON.stringify(suggestedToolsArr),
        },
      });
    }

    // ── Link components if provided ──
    if (componentIds && Array.isArray(componentIds) && componentIds.length > 0) {
      // Validate all component IDs exist and belong to the asset
      const components = await db.componentRegistry.findMany({
        where: { id: { in: componentIds } },
        select: { id: true },
      });
      const validIds = components.map(c => c.id);
      const validComponentIds = componentIds.filter((id: string) => validIds.includes(id));

      if (validComponentIds.length > 0) {
        await db.workOrderComponent.createMany({
          data: validComponentIds.map((cid: string) => ({
            workOrderId: wo.id,
            componentRegistryId: cid,
          })),
        });
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

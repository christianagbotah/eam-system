import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { getPlantScope, canAccessPlant } from '@/lib/plant-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Base include — always available
    const baseInclude = {
      assignee: { select: { id: true, fullName: true, username: true, department: true } },
      teamLeader: { select: { id: true, fullName: true, username: true } },
      assignedSupervisor: { select: { id: true, fullName: true, username: true } },
      assigner: { select: { id: true, fullName: true, username: true } },
      planner: { select: { id: true, fullName: true, username: true } },
      locker: { select: { id: true, fullName: true, username: true } },
      maintenanceRequest: {
        select: {
          id: true,
          requestNumber: true,
          title: true,
          description: true,
          category: true,
          machineDownStatus: true,
          createdAt: true,
          requester: { select: { id: true, fullName: true, username: true } },
          asset: { select: { id: true, name: true, assetTag: true, serialNumber: true } },
        },
      },
      pmSchedule: { select: { id: true, title: true, frequencyType: true, frequencyValue: true } },
      teamMembers: {
        include: { user: { select: { id: true, fullName: true, username: true } } },
        orderBy: { assignedAt: 'asc' as const },
      },
      timeLogs: {
        include: {
          user: { select: { id: true, fullName: true, username: true } },
          loggedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { timestamp: 'desc' as const },
      },
      materials: {
        include: {
          requester: { select: { id: true, fullName: true } },
          approver: { select: { id: true, fullName: true } },
          issuer: { select: { id: true, fullName: true } },
          componentRegistry: { select: { id: true, name: true, componentCode: true } },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      comments: {
        include: { user: { select: { id: true, fullName: true, username: true } } },
        orderBy: { createdAt: 'desc' as const },
      },
      repairToolRequests: {
        include: {
          tool: { select: { id: true, name: true, toolCode: true, category: true } },
          requestedBy: { select: { id: true, fullName: true } },
          supervisorApprovedBy: { select: { id: true, fullName: true } },
          storekeeperApprovedBy: { select: { id: true, fullName: true } },
          issuedByUser: { select: { id: true, fullName: true } },
          items: {
            include: { tool: { select: { id: true, name: true, toolCode: true, category: true } } },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      repairMaterialRequests: {
        include: {
          item: { select: { id: true, name: true, itemCode: true, category: true } },
          requestedBy: { select: { id: true, fullName: true } },
          supervisorApprovedBy: { select: { id: true, fullName: true } },
          storekeeperApprovedBy: { select: { id: true, fullName: true } },
          issuedByUser: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      workOrderComponents: {
        include: {
          componentRegistry: {
            select: { id: true, name: true, componentCode: true, componentType: true, criticality: true, healthScore: true, condition: true },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    } as const;

    // Try full query with teamMemberRequests; fall back to base if table doesn't exist yet
    let wo = await db.workOrder.findUnique({
      where: { id },
      include: {
        ...baseInclude,
        teamMemberRequests: {
          include: {
            requestedByUser: { select: { id: true, fullName: true, username: true } },
            requestedUser: { select: { id: true, fullName: true, username: true } },
            reviewedByUser: { select: { id: true, fullName: true, username: true } },
          },
          orderBy: { createdAt: 'desc' as const },
        },
      },
    }).catch(() => null);

    if (!wo) {
      // Fallback: try without teamMemberRequests (table may not exist yet on VPS)
      wo = await db.workOrder.findUnique({
        where: { id },
        include: baseInclude,
      });
    }

    if (!wo) {
      return NextResponse.json(
        { success: false, error: 'Work order not found' },
        { status: 404 }
      );
    }

    // IDOR protection: ensure user has access to this work order's plant
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, wo.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Permission-based access control: enforce view_own restriction
    const hasViewAll = hasPermission(session, 'work_orders.view') || hasPermission(session, 'work_orders.view_all') || isAdmin(session);
    if (!hasViewAll) {
      // User only has view_own — check if they are assigned or a team member
      const isAssignee = wo.assignedTo === session.userId;
      const isTeamMember = wo.teamMembers?.some((m: { userId: string }) => m.userId === session.userId);
      const isRequester = wo.maintenanceRequest?.requester?.id === session.userId;
      if (!isAssignee && !isTeamMember && !isRequester) {
        return NextResponse.json({ success: false, error: 'Access denied — you can only view work orders assigned to you' }, { status: 403 });
      }
    }

    // Ensure relations arrays exist even if tables weren't queried
    if (!wo.teamMemberRequests) {
      (wo as Record<string, unknown>).teamMemberRequests = [];
    }
    if (!wo.repairToolRequests) {
      (wo as Record<string, unknown>).repairToolRequests = [];
    }
    if (!wo.repairMaterialRequests) {
      (wo as Record<string, unknown>).repairMaterialRequests = [];
    }
    if (!wo.workOrderComponents) {
      (wo as Record<string, unknown>).workOrderComponents = [];
    }

    return NextResponse.json({ success: true, data: wo });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to update work orders' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.workOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Work order not found' },
        { status: 404 }
      );
    }

    // Don't allow updates on locked WOs — permanent lock, no exceptions (not even admin)
    if (existing.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Work order is permanently locked. No modifications are allowed after planner closure.' },
        { status: 400 }
      );
    }

    // Don't allow edits once supervisor has verified the work (awaiting planner closure)
    if (existing.status === 'verified' || existing.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Work order has been reviewed and cannot be edited. Status: ' + existing.status + '. Contact supervisor or planner if changes are needed.' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'type', 'priority',
      'assetId', 'assetName', 'departmentId', 'plantId',
      'estimatedHours', 'plannedStart', 'plannedEnd',
      'totalCost', 'laborCost', 'partsCost', 'contractorCost',
      'failureDescription', 'causeDescription', 'actionDescription',
      'tradeActivity', 'technicalDescription', 'safetyNotes', 'ppeRequired',
      'notes', 'assignedTo', 'teamLeaderId',
      'assignmentType', 'assignedSupervisorId',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'plannedStart' || field === 'plannedEnd') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Map deliveryDateRequired → plannedEnd (there is no separate deliveryDateRequired column)
    if (body.deliveryDateRequired !== undefined) {
      updateData['plannedEnd'] = body.deliveryDateRequired ? new Date(body.deliveryDateRequired) : null;
    }

    const updated = await db.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, fullName: true } },
        teamLeader: { select: { id: true, fullName: true } },
        assignedSupervisor: { select: { id: true, fullName: true } },
        assigner: { select: { id: true, fullName: true } },
        planner: { select: { id: true, fullName: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
        teamMembers: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { assignedAt: 'asc' },
        },
        materials: {
          include: {
            requester: { select: { id: true, fullName: true } },
            componentRegistry: { select: { id: true, name: true, componentCode: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        teamMemberRequests: {
          include: {
            requestedByUser: { select: { id: true, fullName: true, username: true } },
            requestedUser: { select: { id: true, fullName: true, username: true } },
            reviewedByUser: { select: { id: true, fullName: true, username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Handle team members update (relational) — wrapped in a transaction so
    // delete + create happen atomically (no partial state if create fails).
    if (body.teamMembers && Array.isArray(body.teamMembers)) {
      const now = new Date();
      const teamMemberData = body.teamMembers.map((member: { userId: string; role: string }) => ({
        workOrderId: id,
        userId: member.userId,
        role: member.role,
        accessLevel: member.role === 'team_leader' ? 'full' : 'read_only',
        assignedAt: now,
      }));

      await db.$transaction([
        // Delete existing team members
        db.workOrderTeamMember.deleteMany({ where: { workOrderId: id } }),
        // Create new team members (only if there are any to create)
        ...(teamMemberData.length > 0
          ? [db.workOrderTeamMember.createMany({ data: teamMemberData })]
          : []),
      ]);

      // Reload with updated team members
      updated.teamMembers = await db.workOrderTeamMember.findMany({
        where: { workOrderId: id },
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { assignedAt: 'asc' },
      });
    }

    // Handle suggested parts update (stored as JSON + RepairMaterialRequest)
    if (body.requiredParts && Array.isArray(body.requiredParts)) {
      // Delete existing planner-suggested material requests that haven't been acted on yet
      await db.repairMaterialRequest.deleteMany({
        where: { workOrderId: id, source: 'planner_suggested', status: 'pending' },
      });

      const suggestedPartsArr: Array<{ id: string; itemId: string; itemName: string; itemCode: string; quantity: number; unit: string; notes?: string }> = [];
      for (const part of body.requiredParts) {
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

          await db.repairMaterialRequest.create({
            data: {
              workOrderId: id,
              itemId: part.itemId,
              itemName: entry.itemName,
              quantityRequested: entry.quantity,
              unit: entry.unit,
              unitCost: invItem?.unitCost || 0,
              estimatedCost: (invItem?.unitCost || 0) * entry.quantity,
              reason: 'Planner suggested material (updated)',
              plantId: existing.plantId,
              source: 'planner_suggested',
              status: 'pending',
              requestedById: session.userId,
            },
          });
        } else if (typeof part === 'string') {
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
                workOrderId: id,
                itemId: invItem.id,
                itemName: invItem.name,
                quantityRequested: 1,
                unit: invItem.unit || 'each',
                unitCost: invItem.unitCost || 0,
                estimatedCost: invItem.unitCost || 0,
                reason: 'Planner suggested material (updated)',
                plantId: existing.plantId,
                source: 'planner_suggested',
                status: 'pending',
                requestedById: session.userId,
              },
            });
          }
        }
      }
      await db.workOrder.update({ where: { id }, data: { suggestedParts: JSON.stringify(suggestedPartsArr) } });
    }

    // Handle suggested tools update (stored as JSON + RepairToolRequest)
    if (body.requiredTools && Array.isArray(body.requiredTools)) {
      await db.repairToolRequest.deleteMany({
        where: { workOrderId: id, source: 'planner_suggested', status: 'pending' },
      });

      const suggestedToolsArr: Array<{ id: string; toolId: string; toolName: string; toolCode: string; quantity: number; notes?: string }> = [];
      for (const tool of body.requiredTools) {
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
              workOrderId: id,
              toolId: tool.toolId,
              toolName: entry.toolName,
              reason: 'Planner suggested tool (updated)',
              plantId: existing.plantId,
              source: 'planner_suggested',
              status: 'pending',
              urgency: 'normal',
              requestedById: session.userId,
            },
          });
        } else if (typeof tool === 'string') {
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
                workOrderId: id,
                toolId: toolRec.id,
                toolName: toolRec.name,
                reason: 'Planner suggested tool (updated)',
                plantId: existing.plantId,
                source: 'planner_suggested',
                status: 'pending',
                urgency: 'normal',
                requestedById: session.userId,
              },
            });
          }
        }
      }
      await db.workOrder.update({ where: { id }, data: { suggestedTools: JSON.stringify(suggestedToolsArr) } });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_order',
        entityId: id,
        oldValues: JSON.stringify({ title: existing.title, priority: existing.priority }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

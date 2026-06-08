import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hasPermission, isAdmin } from '@/lib/permissions';

// GET /api/work-orders/[id]/suggested-items — Fetch suggested parts & tools
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const wo = await db.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        suggestedParts: true,
        suggestedTools: true,
        plantId: true,
        repairMaterialRequests: {
          where: { source: 'planner_suggested' },
          select: {
            id: true,
            itemName: true,
            quantityRequested: true,
            quantityApproved: true,
            quantityIssued: true,
            unit: true,
            status: true,
            itemId: true,
            item: { select: { itemCode: true, currentStock: true, unitCost: true } },
            source: true,
          },
        },
        repairToolRequests: {
          where: { source: 'planner_suggested' },
          select: {
            id: true,
            toolName: true,
            status: true,
            toolId: true,
            tool: { select: { toolCode: true, status: true } },
            source: true,
          },
        },
      },
    });

    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const suggestedParts = JSON.parse(wo.suggestedParts || '[]');
    const suggestedTools = JSON.parse(wo.suggestedTools || '[]');

    // Merge suggested items with their pipeline status from repair requests
    const partsWithStatus = suggestedParts.map((p: Record<string, unknown>) => {
      const matReq = wo.repairMaterialRequests.find(
        (mr: { itemId: string | null }) => mr.itemId === p.itemId
      );
      return {
        ...p,
        pipelineId: matReq?.id || null,
        pipelineStatus: matReq?.status || 'suggested',
        quantityApproved: matReq?.quantityApproved || 0,
        quantityIssued: matReq?.quantityIssued || 0,
        currentStock: matReq?.item?.currentStock || 0,
        unitCost: matReq?.item?.unitCost || 0,
      };
    });

    const toolsWithStatus = suggestedTools.map((t: Record<string, unknown>) => {
      const toolReq = wo.repairToolRequests.find(
        (tr: { toolId: string | null }) => tr.toolId === t.toolId
      );
      return {
        ...t,
        pipelineId: toolReq?.id || null,
        pipelineStatus: toolReq?.status || 'suggested',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        suggestedParts: partsWithStatus,
        suggestedTools: toolsWithStatus,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch suggested items';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/work-orders/[id]/suggested-items — Update suggested parts & tools
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const wo = await db.workOrder.findUnique({
      where: { id },
      select: { id: true, plantId: true, suggestedParts: true, suggestedTools: true },
    });

    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (action === 'reject_item') {
      const { itemType, itemId } = body;
      if (itemType === 'part') {
        const parts = JSON.parse(wo.suggestedParts || '[]') as Array<Record<string, unknown>>;
        const filtered = parts.filter((p) => p.itemId !== itemId);
        await db.workOrder.update({
          where: { id },
          data: { suggestedParts: JSON.stringify(filtered) },
        });
        await db.repairMaterialRequest.updateMany({
          where: { workOrderId: id, itemId: itemId as string, source: 'planner_suggested', status: 'pending' },
          data: { status: 'rejected', notes: 'Rejected by ' + (session.userName || 'user') },
        });
      } else if (itemType === 'tool') {
        const tools = JSON.parse(wo.suggestedTools || '[]') as Array<Record<string, unknown>>;
        const filtered = tools.filter((t) => t.toolId !== itemId);
        await db.workOrder.update({
          where: { id },
          data: { suggestedTools: JSON.stringify(filtered) },
        });
        await db.repairToolRequest.updateMany({
          where: { workOrderId: id, toolId: itemId as string, source: 'planner_suggested', status: 'pending' },
          data: { status: 'rejected', rejectionReason: 'Rejected by ' + (session.userName || 'user') },
        });
      }

      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'reject_suggested_item',
          entityType: 'work_order',
          entityId: id,
          newValues: JSON.stringify({ itemType, itemId, action: 'rejected' }),
        },
      });

      return NextResponse.json({ success: true, message: 'Item rejected' });
    }

    if (action === 'add_item') {
      const { itemType, item } = body;
      if (itemType === 'part' && item) {
        const parts = JSON.parse(wo.suggestedParts || '[]') as Array<Record<string, unknown>>;
        const newPart = {
          id: crypto.randomUUID(),
          itemId: item.itemId,
          itemName: item.itemName || 'Unknown Part',
          itemCode: item.itemCode || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'each',
          notes: item.notes || '',
        };
        parts.push(newPart);
        await db.workOrder.update({
          where: { id },
          data: { suggestedParts: JSON.stringify(parts) },
        });
        await db.repairMaterialRequest.create({
          data: {
            workOrderId: id,
            itemId: item.itemId,
            itemName: newPart.itemName,
            quantityRequested: newPart.quantity,
            unit: newPart.unit,
            estimatedCost: item.unitCost ? item.unitCost * newPart.quantity : 0,
            reason: item.notes || 'Added by ' + (session.userName || 'user'),
            plantId: wo.plantId,
            source: 'planner_suggested',
            status: 'pending',
            requestedById: session.userId,
          },
        });
      } else if (itemType === 'tool' && item) {
        const tools = JSON.parse(wo.suggestedTools || '[]') as Array<Record<string, unknown>>;
        const newTool = {
          id: crypto.randomUUID(),
          toolId: item.toolId,
          toolName: item.toolName || 'Unknown Tool',
          toolCode: item.toolCode || '',
          quantity: item.quantity || 1,
          notes: item.notes || '',
        };
        tools.push(newTool);
        await db.workOrder.update({
          where: { id },
          data: { suggestedTools: JSON.stringify(tools) },
        });
        await db.repairToolRequest.create({
          data: {
            workOrderId: id,
            toolId: item.toolId,
            toolName: newTool.toolName,
            reason: item.notes || 'Added by ' + (session.userName || 'user'),
            plantId: wo.plantId,
            source: 'planner_suggested',
            status: 'pending',
            urgency: 'normal',
            requestedById: session.userId,
          },
        });
      }

      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'add_suggested_item',
          entityType: 'work_order',
          entityId: id,
          newValues: JSON.stringify({ itemType, item }),
        },
      });

      return NextResponse.json({ success: true, message: 'Item added' });
    }

    if (action === 'update_quantity') {
      const { itemType, itemId, quantity } = body;
      if (itemType === 'part' && quantity > 0) {
        const parts = JSON.parse(wo.suggestedParts || '[]') as Array<Record<string, unknown>>;
        const updated = parts.map((p) =>
          p.itemId === itemId ? { ...p, quantity } : p
        );
        await db.workOrder.update({
          where: { id },
          data: { suggestedParts: JSON.stringify(updated) },
        });
        await db.repairMaterialRequest.updateMany({
          where: { workOrderId: id, itemId: itemId as string, source: 'planner_suggested', status: 'pending' },
          data: { quantityRequested: quantity },
        });
      } else if (itemType === 'tool' && quantity > 0) {
        const tools = JSON.parse(wo.suggestedTools || '[]') as Array<Record<string, unknown>>;
        const updated = tools.map((t) =>
          t.toolId === itemId ? { ...t, quantity } : t
        );
        await db.workOrder.update({
          where: { id },
          data: { suggestedTools: JSON.stringify(updated) },
        });
      }

      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'update_suggested_item_qty',
          entityType: 'work_order',
          entityId: id,
          newValues: JSON.stringify({ itemType, itemId, quantity }),
        },
      });

      return NextResponse.json({ success: true, message: 'Quantity updated' });
    }

    if (action === 'send_to_store') {
      const pendingMatReqs = await db.repairMaterialRequest.findMany({
        where: { workOrderId: id, source: 'planner_suggested', status: 'pending' },
      });
      const pendingToolReqs = await db.repairToolRequest.findMany({
        where: { workOrderId: id, source: 'planner_suggested', status: 'pending' },
      });

      const storekeepers = await db.user.findMany({
        where: {
          role: { in: ['storekeeper', 'admin'] },
          ...(wo.plantId ? { userPlants: { some: { plantId: wo.plantId } } } : {}),
        },
        select: { id: true, fullName: true },
      });

      const totalCount = pendingMatReqs.length + pendingToolReqs.length;
      if (totalCount === 0) {
        return NextResponse.json({ success: true, message: 'No pending items to send' });
      }

      for (const sk of storekeepers) {
        await db.notification.create({
          data: {
            userId: sk.id,
            type: 'material_request',
            title: `Material/Tool Request Ready for Review`,
            message: `${pendingMatReqs.length} material(s) and ${pendingToolReqs.length} tool(s) from WO need your review.`,
            actionUrl: `maintenance?tab=repairs-material-requests`,
            isRead: false,
          },
        });
      }

      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'send_suggested_to_store',
          entityType: 'work_order',
          entityId: id,
          newValues: JSON.stringify({
            materialCount: pendingMatReqs.length,
            toolCount: pendingToolReqs.length,
            notifiedStorekeepers: storekeepers.length,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `${totalCount} item(s) sent to store. ${storekeepers.length} storekeeper(s) notified.`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update suggested items';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

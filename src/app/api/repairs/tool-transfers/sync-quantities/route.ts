import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { checkAndCloseToolRequest } from '@/lib/tool-transfer-helpers';

// POST /api/repairs/tool-transfers/sync-quantities
// Repair: sync quantityTransferred on tool request items based on actual transfer records.
// This fixes cases where incrementToolRequestTransfer failed to match items.
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    if (!hasPermission(session, 'repair_tool_transfers.update') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { workOrderId } = body;

    let synced = 0;

    // Build the query — only sync completed/handover transfers
    const where: Record<string, unknown> = { status: { in: ['transferred', 'awaiting_handover'] } };

    if (workOrderId) {
      // If workOrderId provided, only sync transfers for tools on that WO
      const toolItems = await db.repairToolRequestItem.findMany({
        where: { repairToolRequest: { workOrderId } },
        select: { toolId: true, toolName: true, toolCode: true },
      });
      const toolIds = toolItems.filter(i => i.toolId).map(i => i.toolId) as string[];
      if (toolIds.length > 0) {
        where.toolId = { in: toolIds };
      } else {
        return NextResponse.json({ success: true, synced: 0, message: 'No linked tool IDs found' });
      }
    }

    // Find all completed/pending-handover transfers
    const transfers = await db.toolTransferRequest.findMany({
      where,
      select: { id: true, toolId: true, fromUserId: true },
    });

    // Group by toolId + fromUserId to get actual transfer count per tool per user
    const transferCounts = new Map<string, number>();
    for (const t of transfers) {
      const key = `${t.toolId}_${t.fromUserId}`;
      transferCounts.set(key, (transferCounts.get(key) || 0) + 1);
    }

    for (const [key, actualCount] of transferCounts) {
      const [toolId, fromUserId] = key.split('_');

      // Phase 1: Exact toolId match on items
      const exactItems = await db.repairToolRequestItem.findMany({
        where: { toolId },
        include: { repairToolRequest: { select: { status: true } } },
      });

      for (const item of exactItems) {
        const issued = item.quantityIssued || 0;
        const ret = item.quantityReturned || 0;
        const xfer = item.quantityTransferred || 0;
        if (actualCount > xfer && (ret + actualCount) <= issued) {
          await db.repairToolRequestItem.update({
            where: { id: item.id },
            data: { quantityTransferred: actualCount },
          });
          synced++;
          await checkAndCloseToolRequest(item.repairToolRequestId);
        }
      }

      // Phase 2: Fallback — match by tool name/code for items where toolId is null
      if (exactItems.length === 0) {
        const tool = await db.tool.findUnique({ where: { id: toolId }, select: { name: true, toolCode: true } });
        if (tool) {
          const fallbackItems = await db.repairToolRequestItem.findMany({
            where: {
              toolId: null,
              OR: [
                { toolName: tool.name },
                ...(tool.toolCode ? [{ toolCode: tool.toolCode }] : []),
              ],
            },
            include: { repairToolRequest: { select: { status: true } } },
          });

          for (const item of fallbackItems) {
            const issued = item.quantityIssued || 0;
            const ret = item.quantityReturned || 0;
            const xfer = item.quantityTransferred || 0;
            if (xfer < actualCount && (ret + actualCount) <= issued) {
              await db.repairToolRequestItem.update({
                where: { id: item.id },
                data: { quantityTransferred: actualCount },
              });
              synced++;
              await checkAndCloseToolRequest(item.repairToolRequestId);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, synced });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

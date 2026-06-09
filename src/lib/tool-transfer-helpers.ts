import { db } from '@/lib/db';

/**
 * Tool Transfer ↔ Tool Request synchronization helpers.
 *
 * When a transfer is SUBMITTED (created), we immediately increment `quantityTransferred`
 * on the matching tool request item. This reserves the quantity so:
 * - The tool request detail shows "Transferred: X" right away
 * - Return/Transfer buttons correctly adjust (hasOutstandingItems checks issued > returned + transferred)
 *
 * When a transfer is REJECTED or CANCELLED, we decrement `quantityTransferred` to free the quantity.
 *
 * When a transfer COMPLETES (both parties accept), the quantity was already incremented at submission,
 * so we only need to check if the entire request is now done.
 */

/** Helper: find tool request items matching a tool ID, with fallback by name/code */
async function findMatchingToolRequestItems(toolId: string): Promise<{ reqId: string; item: any }[]> {
  const results: { reqId: string; item: any }[] = [];

  // Phase 1: Exact toolId match on items
  const exactRequests = await db.repairToolRequest.findMany({
    where: {
      status: { in: ['issued', 'pending_return', 'returned', 'transferred'] },
      items: { some: { toolId } },
    },
    include: { items: true },
  });

  for (const req of exactRequests) {
    for (const item of req.items) {
      if (item.toolId === toolId) {
        results.push({ reqId: req.id, item });
      }
    }
  }

  // Phase 2: Fallback — match by tool name or tool code for items where toolId is null
  if (results.length === 0) {
    const tool = await db.tool.findUnique({ where: { id: toolId }, select: { name: true, toolCode: true } });
    if (tool) {
      const fallbackRequests = await db.repairToolRequest.findMany({
        where: {
          status: { in: ['issued', 'pending_return', 'returned', 'transferred'] },
          items: { some: {
            toolId: null,
            OR: [
              { toolName: tool.name },
              ...(tool.toolCode ? [{ toolCode: tool.toolCode }] : []),
            ],
          }},
        },
        include: { items: true },
      });

      for (const req of fallbackRequests) {
        for (const item of req.items) {
          if (item.toolId === null && (
            item.toolName === tool.name ||
            (tool.toolCode && item.toolCode === tool.toolCode)
          )) {
            results.push({ reqId: req.id, item });
          }
        }
      }
    }
  }

  return results;
}

/** Helper: reopen a request if it was prematurely closed */
async function reopenIfClosed(reqId: string) {
  const req = await db.repairToolRequest.findUnique({ where: { id: reqId }, select: { status: true } });
  if (req && (req.status === 'returned' || req.status === 'transferred')) {
    await db.repairToolRequest.update({
      where: { id: reqId },
      data: { status: 'issued', returnedAt: null },
    });
  }
}

/** Increment quantityTransferred on matching tool request items when a transfer is submitted */
export async function incrementToolRequestTransfer(toolId: string, fromUserId: string) {
  const matches = await findMatchingToolRequestItems(toolId);

  for (const { reqId, item } of matches) {
    const issued = item.quantityIssued || 0;
    const ret = item.quantityReturned || 0;
    const xfer = item.quantityTransferred || 0;
    if ((ret + xfer) < issued) {
      await db.repairToolRequestItem.update({
        where: { id: item.id },
        data: { quantityTransferred: { increment: 1 } },
      });
      // Reopen if prematurely closed
      await reopenIfClosed(reqId);
    }
    // Check if all items are now fully returned/transferred → close the request
    await checkAndCloseToolRequest(reqId);
  }
}

/** Decrement quantityTransferred on matching tool request items when a transfer is rejected/cancelled */
export async function decrementToolRequestTransfer(toolId: string, fromUserId: string) {
  const matches = await findMatchingToolRequestItems(toolId);

  for (const { reqId, item } of matches) {
    const xfer = item.quantityTransferred || 0;
    if (xfer > 0) {
      await db.repairToolRequestItem.update({
        where: { id: item.id },
        data: { quantityTransferred: { decrement: 1 } },
      });
      // Reopen if prematurely closed
      await reopenIfClosed(reqId);
    }
  }
}

/** Check if all items in a tool request are fully returned/transferred and close the request */
export async function checkAndCloseToolRequest(reqId: string) {
  // Don't close requests that are pending return confirmation
  const req = await db.repairToolRequest.findUnique({ where: { id: reqId }, select: { status: true } });
  if (!req || req.status === 'pending_return') return;

  const items = await db.repairToolRequestItem.findMany({ where: { repairToolRequestId: reqId } });
  if (items.length === 0) return;
  let allDone = true;
  let hasTransfers = false;
  let hasReturns = false;
  for (const item of items) {
    const issued = item.quantityIssued || 0;
    const ret = item.quantityReturned || 0;
    const xfer = item.quantityTransferred || 0;
    if ((ret + xfer) < issued) { allDone = false; break; }
    if (xfer > 0) hasTransfers = true;
    if (ret > 0) hasReturns = true;
  }
  if (allDone) {
    // If all items were transferred out (no returns), set status to 'transferred'
    // If all items were returned, or mixed returns+transfers, set status to 'returned'
    const newStatus = (hasTransfers && !hasReturns) ? 'transferred' : 'returned';
    await db.repairToolRequest.update({
      where: { id: reqId },
      data: { status: newStatus, returnedAt: new Date() },
    });
  }
}

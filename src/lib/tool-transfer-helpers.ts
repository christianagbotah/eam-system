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

/** Increment quantityTransferred on matching tool request items when a transfer is submitted */
export async function incrementToolRequestTransfer(toolId: string, fromUserId: string) {
  const activeRequests = await db.repairToolRequest.findMany({
    where: {
      status: { in: ['issued', 'returned'] },
      OR: [{ toolId }, { items: { some: { toolId } } }],
    },
    include: { items: true },
  });

  for (const req of activeRequests) {
    if (req.toolId === toolId && (!req.items || req.items.length === 0)) continue; // Legacy single-tool
    if (req.items && req.items.length > 0) {
      for (const item of req.items) {
        if (item.toolId === toolId) {
          const issued = item.quantityIssued || 0;
          const ret = item.quantityReturned || 0;
          const xfer = item.quantityTransferred || 0;
          if ((ret + xfer) < issued) {
            await db.repairToolRequestItem.update({
              where: { id: item.id },
              data: { quantityTransferred: { increment: 1 } },
            });
            // Reset request status if prematurely set to 'returned'
            if (req.status === 'returned') {
              await db.repairToolRequest.update({ where: { id: req.id }, data: { status: 'issued' } });
            }
          }
        }
      }
      // Check if all items are now fully returned/transferred → close the request
      await checkAndCloseToolRequest(req.id);
    }
  }
}

/** Decrement quantityTransferred on matching tool request items when a transfer is rejected/cancelled */
export async function decrementToolRequestTransfer(toolId: string, fromUserId: string) {
  const activeRequests = await db.repairToolRequest.findMany({
    where: {
      status: { in: ['issued', 'returned'] },
      OR: [{ toolId }, { items: { some: { toolId } } }],
    },
    include: { items: true },
  });

  for (const req of activeRequests) {
    if (req.toolId === toolId && (!req.items || req.items.length === 0)) continue;
    if (req.items && req.items.length > 0) {
      for (const item of req.items) {
        if (item.toolId === toolId) {
          const xfer = item.quantityTransferred || 0;
          if (xfer > 0) {
            await db.repairToolRequestItem.update({
              where: { id: item.id },
              data: { quantityTransferred: { decrement: 1 } },
            });
          }
        }
      }
    }
  }
}

/** Check if all items in a tool request are fully returned/transferred and close the request */
export async function checkAndCloseToolRequest(reqId: string) {
  const items = await db.repairToolRequestItem.findMany({ where: { repairToolRequestId: reqId } });
  if (items.length === 0) return;
  let allDone = true;
  for (const item of items) {
    const issued = item.quantityIssued || 0;
    const ret = item.quantityReturned || 0;
    const xfer = item.quantityTransferred || 0;
    if ((ret + xfer) < issued) { allDone = false; break; }
  }
  if (allDone) {
    await db.repairToolRequest.update({
      where: { id: reqId },
      data: { status: 'returned', returnedAt: new Date() },
    });
  }
}

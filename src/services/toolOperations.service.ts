/**
 * Tool Operations Service — Atomic tool issue/return for repair WOs
 *
 * Ensures that multi-item tool issue and return operations are fully atomic.
 * All DB operations within a single logical action execute in one Prisma transaction.
 */

import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { checkToolCalibration } from '@/services/toolCalibration.service';

const VALID_CONDITIONS = ['new', 'good', 'fair', 'poor', 'damaged'];

export interface IssueItem {
  itemId: string;
  quantityIssued: number;
  issueNotes?: string;
}

export interface ReturnItem {
  itemId: string;
  quantityReturned: number;
  conditionAtReturn?: string;
  notes?: string;
}

export interface AtomicIssueResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  updatedRequest?: any;
}

export interface AtomicReturnResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  allReturned?: boolean;
  updatedRequest?: any;
}

/**
 * Atomically issue tools for a repair tool request.
 * All item deductions, transactions, and status updates happen in one transaction.
 */
export async function atomicIssueTools(
  toolRequestId: string,
  session: { userId: string; fullName?: string },
  issuedItems: IssueItem[],
): Promise<AtomicIssueResult> {
  const warnings: string[] = [];
  const now = new Date();

  try {
    const result = await db.$transaction(async (tx) => {
      // Fetch request with items and tools in a consistent snapshot
      const toolReq = await tx.repairToolRequest.findUnique({
        where: { id: toolRequestId },
        include: {
          items: { include: { tool: true } },
          tool: true,
          workOrder: { select: { woNumber: true, plannerId: true } },
          requestedBy: { select: { id: true, fullName: true } },
        },
      });

      if (!toolReq) throw new Error('Tool request not found');
      if (toolReq.status !== 'storekeeper_approved') {
        throw new Error(`Cannot issue: status is ${toolReq.status}`);
      }

      if (toolReq.items.length > 0) {
        if (!Array.isArray(issuedItems) || issuedItems.length === 0) {
          throw new Error('issuedItems array is required for multi-tool requests');
        }

        // Process all items atomically
        for (const issuedItem of issuedItems) {
          const lineItem = toolReq.items.find((i: any) => i.id === issuedItem.itemId);
          if (!lineItem) {
            warnings.push(`Item ${issuedItem.itemId} not found in this request, skipping`);
            continue;
          }

          const qtyToIssue = Math.max(0, Math.min(
            parseInt(String(issuedItem.quantityIssued), 10) || 0,
            lineItem.quantityApproved ?? lineItem.quantityRequested,
          ));

          if (qtyToIssue === 0) {
            await tx.repairToolRequestItem.update({
              where: { id: lineItem.id },
              data: { availabilityStatus: 'unavailable', issueNotes: issuedItem.issueNotes || 'No quantity issued' },
            });
            continue;
          }

          if (lineItem.toolId) {
            // Calibration check — runs outside tx (read-only)
            const calCheck = await checkToolCalibration(lineItem.toolId)
            if (calCheck.blocked) {
              warnings.push(`"${lineItem.toolName}" BLOCKED: ${calCheck.reason || 'calibration issue'}. Item skipped.`)
              await tx.repairToolRequestItem.update({
                where: { id: lineItem.id },
                data: { availabilityStatus: 'unavailable', issueNotes: calCheck.reason || 'Blocked by calibration check' },
              })
              continue
            }
            if (calCheck.reason) {
              warnings.push(`"${lineItem.toolName}" WARNING: ${calCheck.reason}`)
            }

            // Re-read tool within transaction for consistent snapshot (prevents concurrent over-issue)
            const tool = await tx.tool.findUnique({ where: { id: lineItem.toolId } });
            if (!tool) {
              warnings.push(`Tool "${lineItem.toolName}" not found`);
              continue;
            }

            if (tool.quantity < qtyToIssue) {
              warnings.push(`"${lineItem.toolName}": only ${tool.quantity} available, issuing all available`);
            }

            const actualIssued = Math.min(qtyToIssue, tool.quantity);
            const conditionAtIssue = tool.condition;

            // Prevent negative quantity
            if (actualIssued <= 0) continue;

            // Deduct from tool within transaction
            await tx.tool.update({
              where: { id: lineItem.toolId },
              data: {
                quantity: { decrement: actualIssued },
                status: tool.quantity - actualIssued <= 0 ? 'checked_out' : tool.status,
                ...(tool.quantity - actualIssued <= 0 && !tool.assignedToId
                  ? { assignedToId: toolReq.requestedById, checkedOutAt: now }
                  : {}),
              },
            });

            // Create transaction record
            await tx.toolTransaction.create({
              data: {
                toolId: lineItem.toolId,
                type: 'checkout',
                toUserId: toolReq.requestedById,
                notes: `Issued ${actualIssued}x for WO ${toolReq.workOrder.woNumber} (condition: ${conditionAtIssue})${qtyToIssue < lineItem.quantityRequested ? ' [PARTIAL]' : ''}`,
                performedById: session.userId,
              },
            });

            // Update line item
            await tx.repairToolRequestItem.update({
              where: { id: lineItem.id },
              data: {
                quantityIssued: actualIssued,
                conditionAtIssue,
                availabilityStatus: actualIssued >= lineItem.quantityRequested ? 'available' : 'limited',
                issueNotes: issuedItem.issueNotes || (actualIssued < qtyToIssue ? `Only ${actualIssued} available in stock` : null),
              },
            });
          } else {
            // No toolId — just update the line item
            await tx.repairToolRequestItem.update({
              where: { id: lineItem.id },
              data: {
                quantityIssued: qtyToIssue,
                availabilityStatus: qtyToIssue >= lineItem.quantityRequested ? 'available' : 'limited',
                issueNotes: issuedItem.issueNotes || null,
              },
            });
          }
        }
      } else if (toolReq.toolId) {
        // Legacy single-tool request
        const tool = toolReq.tool;

        // Calibration check for single-tool path
        const calCheck = await checkToolCalibration(toolReq.toolId)
        if (calCheck.blocked) {
          warnings.push(`Tool '${tool?.name || toolReq.toolId}' BLOCKED: ${calCheck.reason || 'calibration issue'}. Single-tool issue skipped.`)
          return { success: true, warnings, updatedRequest: null }
        }
        if (calCheck.reason) {
          warnings.push(`Tool '${tool?.name || toolReq.toolId}' WARNING: ${calCheck.reason}`)
        }

        if (!tool || (tool.status !== 'in_repair' && tool.status !== 'available')) {
          throw new Error(`Tool is not available for issue (current status: ${tool?.status})`);
        }

        const conditionAtIssue = toolReq.toolConditionAtIssue || tool.condition;

        await tx.tool.update({
          where: { id: toolReq.toolId },
          data: { status: 'checked_out', assignedToId: toolReq.requestedById, checkedOutAt: now },
        });
        await tx.toolTransaction.create({
          data: {
            toolId: toolReq.toolId,
            type: 'checkout',
            toUserId: toolReq.requestedById,
            notes: `Issued for WO ${toolReq.workOrder.woNumber} (condition: ${conditionAtIssue})`,
            performedById: session.userId,
          },
        });
        await tx.repairToolRequest.update({
          where: { id: toolRequestId },
          data: { toolConditionAtIssue: conditionAtIssue },
        });
      }

      // Update request status to issued
      const updated = await tx.repairToolRequest.update({
        where: { id: toolRequestId },
        data: { status: 'issued', issuedById: session.userId, issuedAt: now },
        include: {
          requestedBy: { select: { id: true, fullName: true, username: true } },
          supervisorApprovedBy: { select: { id: true, fullName: true } },
          storekeeperApprovedBy: { select: { id: true, fullName: true } },
          issuedByUser: { select: { id: true, fullName: true } },
          returnedByUser: { select: { id: true, fullName: true } },
          workOrder: { select: { id: true, woNumber: true, title: true, status: true, assignedSupervisorId: true, plannerId: true, assignedSupervisor: { select: { id: true, fullName: true } } } },
          tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, condition: true, quantity: true } },
          items: { include: { tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, condition: true, quantity: true } } }, orderBy: { createdAt: 'asc' } },
        },
      });

      return updated;
    });

    return { success: true, warnings: warnings.length > 0 ? warnings : undefined, updatedRequest: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Atomic tool issue failed';
    return { success: false, error: message };
  }
}

/**
 * Atomically confirm tool return by store keeper.
 * All inventory updates, transactions, and status changes happen in one transaction.
 */
export async function atomicConfirmToolReturn(
  toolRequestId: string,
  session: { userId: string; fullName?: string },
): Promise<AtomicReturnResult> {
  const warnings: string[] = [];
  const now = new Date();

  try {
    const result = await db.$transaction(async (tx) => {
      const toolReq = await tx.repairToolRequest.findUnique({
        where: { id: toolRequestId },
        include: {
          items: { include: { tool: true } },
          tool: true,
          workOrder: { select: { woNumber: true, plannerId: true } },
          requestedBy: { select: { id: true, fullName: true } },
        },
      });

      if (!toolReq) throw new Error('Tool request not found');
      if (toolReq.status !== 'pending_return') {
        throw new Error(`Cannot confirm return: status is ${toolReq.status}`);
      }

      // Process pending returns for all items
      if (toolReq.items.length > 0) {
        for (const item of toolReq.items) {
          if (!item.pendingReturnQty || item.pendingReturnQty <= 0) continue;

          const condition = VALID_CONDITIONS.includes(item.pendingReturnCondition || '')
            ? item.pendingReturnCondition!
            : 'good';

          if (item.toolId) {
            const tool = await tx.tool.findUnique({ where: { id: item.toolId } });
            if (tool) {
              const toolStatus = (condition === 'poor' || condition === 'damaged') ? 'in_repair' :
                (tool.quantity + item.pendingReturnQty > 0 ? 'available' : tool.status);

              await tx.tool.update({
                where: { id: item.toolId },
                data: {
                  quantity: { increment: item.pendingReturnQty },
                  status: toolStatus,
                  condition,
                  ...(toolStatus === 'available' ? { assignedToId: null, checkedOutAt: null } : {}),
                },
              });

              await tx.toolTransaction.create({
                data: {
                  toolId: item.toolId,
                  type: 'return',
                  fromUserId: toolReq.requestedById,
                  notes: `Returned ${item.pendingReturnQty}x from WO ${toolReq.workOrder.woNumber} (condition: ${condition})${item.pendingReturnNotes ? ` — ${item.pendingReturnNotes}` : ''}`,
                  performedById: session.userId,
                },
              });
            }
          }

          // Move pending → confirmed
          await tx.repairToolRequestItem.update({
            where: { id: item.id },
            data: {
              quantityReturned: { increment: item.pendingReturnQty },
              conditionAtReturn: condition,
              pendingReturnQty: 0,
              pendingReturnCondition: null,
              pendingReturnNotes: null,
            },
          });

          if (condition === 'poor' || condition === 'damaged') {
            warnings.push(`"${item.toolName}" confirmed in "${condition}" condition — flagged for repair`);
          }
        }
      } else if (toolReq.toolId) {
        // Legacy single-tool
        const resolvedCondition = VALID_CONDITIONS.includes(toolReq.toolConditionAtReturn || '')
          ? toolReq.toolConditionAtReturn! : 'good';

        const toolStatus = (resolvedCondition === 'poor' || resolvedCondition === 'damaged') ? 'in_repair' : 'available';
        await tx.tool.update({
          where: { id: toolReq.toolId },
          data: { status: toolStatus, assignedToId: null, checkedOutAt: null, condition: resolvedCondition },
        });
        await tx.toolTransaction.create({
          data: {
            toolId: toolReq.toolId,
            type: 'return',
            fromUserId: toolReq.requestedById,
            notes: `Returned from WO ${toolReq.workOrder.woNumber} (condition: ${resolvedCondition})`,
            performedById: session.userId,
          },
        });
      }

      // Check if ALL items are now fully returned/transferred
      let allDone = true;
      if (toolReq.items.length > 0) {
        const refreshedItems = await tx.repairToolRequestItem.findMany({
          where: { repairToolRequestId: toolRequestId },
        });
        for (const item of refreshedItems) {
          const issued = item.quantityIssued || 0;
          const ret = item.quantityReturned || 0;
          const xfer = item.quantityTransferred || 0;
          if ((ret + xfer) < issued) { allDone = false; break; }
        }
      }

      // Update request status
      const updated = await tx.repairToolRequest.update({
        where: { id: toolRequestId },
        data: {
          status: allDone ? 'returned' : 'issued',
          ...(allDone ? { returnedAt: now } : {}),
          returnConfirmedById: session.userId,
          returnConfirmedAt: now,
        },
        include: {
          requestedBy: { select: { id: true, fullName: true, username: true } },
          issuedByUser: { select: { id: true, fullName: true } },
          returnedByUser: { select: { id: true, fullName: true } },
          workOrder: { select: { id: true, woNumber: true, title: true, status: true, plannerId: true } },
          tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, condition: true, quantity: true } },
          items: { include: { tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, condition: true, quantity: true } } }, orderBy: { createdAt: 'asc' } },
        },
      });

      return { updated, allDone };
    });

    return {
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      allReturned: result.allDone,
      updatedRequest: result.updated,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Atomic tool return confirmation failed';
    return { success: false, error: message };
  }
}

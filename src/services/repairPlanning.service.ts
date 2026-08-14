/**
 * @file Repair Planning Service — Canonical MR→WO conversion domain service
 *
 * Extracts ALL business logic from the convert API route into a single,
 * pure-domain async function. The entire DB operation runs inside one
 * `db.$transaction()` for atomicity. HTTP concerns (auth, permissions,
 * response shaping) remain in the API route.
 *
 * @see src/app/api/maintenance-requests/[id]/convert/route.ts
 */

import { db } from '@/lib/db';
import { executeTransition } from '@/lib/state-machine';
import type { Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

/** Minimal session shape — permissions are assumed already checked by the caller. */
export interface SessionLike {
  userId: string;
  fullName?: string;
  roles: string[];
}

/** Payload accepted by the conversion service. */
export interface ConvertMRToWOPayload {
  title?: string;
  priority?: string; // low, medium, high, urgent, critical
  workOrderType?: string; // breakdown, preventive, corrective, predictive, inspection, project, emergency
  tradeActivity?: string; // mechanical, electrical, civil, facility, workshop, other
  technicalDescription?: string;
  assignmentType?: 'direct' | 'via_supervisor';
  assignedTo?: string;
  teamLeaderId?: string;
  teamMembers?: Array<{ userId: string; role: string }>;
  assignedSupervisorId?: string;
  failureDescription?: string;
  causeDescription?: string;
  actionDescription?: string;
  estimatedHours?: number;
  plannedStart?: string;
  plannedEnd?: string;
  deliveryDateRequired?: string;
  safetyNotes?: string;
  ppeRequired?: string;
  notes?: string;
  requiredParts?: Array<{ itemId: string; quantity?: number }>;
  requiredTools?: Array<{ toolId: string; quantity?: number }>;
}

/** Notification payload returned to the caller for post-tx dispatch. */
export interface ConversionNotification {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  actionUrl: string;
  options?: Record<string, unknown>;
}

/** Result of the conversion operation. */
export interface ConvertMRToWOResult {
  success: boolean;
  workOrder?: any; // WorkOrder with includes
  error?: string;
  conflictWoNumber?: string; // populated on 409-like idempotency conflict
  notifications?: ConversionNotification[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum retries when a P2002 unique constraint violation occurs during WO number generation. */
const WO_NUMBER_MAX_RETRIES = 3;

// ============================================================================
// HELPERS (file-private)
// ============================================================================

/**
 * Build a WO number string from a month prefix and sequence number.
 * @param monthStr - YYYYMM format (e.g. "202506")
 * @param seq     - Sequential number to pad to 4 digits
 */
function buildWoNumber(monthStr: string, seq: number): string {
  return `WO-${monthStr}-${String(seq).padStart(4, '0')}`;
}

/** Determine the base sequence and month prefix for WO number generation. */
async function determineBaseSequence(
  tx: Prisma.TransactionClient,
): Promise<{ monthStr: string; baseSeq: number }> {
  const now = new Date();
  const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastWO = await tx.workOrder.findFirst({
    where: { woNumber: { startsWith: `WO-${monthStr}` } },
    orderBy: { woNumber: 'desc' },
  });
  if (!lastWO) return { monthStr, baseSeq: 1 };
  const parts = lastWO.woNumber.split('-');
  return { monthStr, baseSeq: (parseInt(parts[2] || '0', 10) + 1) };
}

/** Build a `ConversionNotification` for the MR requester. */
function buildRequesterNotification(
  mr: { requestedBy: string },
  wo: { woNumber: string; id: string },
  session: SessionLike,
): ConversionNotification | null {
  if (!mr.requestedBy || mr.requestedBy === session.userId) return null;
  return {
    userId: mr.requestedBy,
    type: 'mr_converted',
    title: 'MR Converted to Work Order',
    message: `Your request has been converted to WO ${wo.woNumber} by ${session.fullName ?? 'a planner'}`,
    entityType: 'work_order',
    entityId: wo.id,
    actionUrl: `wo-detail?id=${wo.id}`,
  };
}

/** Build notifications for assigned team members (team leader, assignee, members, supervisor). */
function buildAssignmentNotifications(
  payload: ConvertMRToWOPayload,
  wo: { woNumber: string; id: string; title: string },
  session: SessionLike,
): ConversionNotification[] {
  const notifications: ConversionNotification[] = [];
  const sentTo = new Set<string>();

  const add = (userId: string | undefined, type: string, title: string, msg: string, opts?: Record<string, unknown>) => {
    if (!userId || userId === session.userId || sentTo.has(userId)) return;
    sentTo.add(userId);
    notifications.push({
      userId,
      type,
      title,
      message: msg,
      entityType: 'work_order',
      entityId: wo.id,
      actionUrl: `wo-detail?id=${wo.id}`,
      options: opts,
    });
  };

  // Team leader
  add(
    payload.teamLeaderId,
    'wo_assigned',
    'Work Order Team Lead Assignment',
    `${session.fullName ?? 'A planner'} assigned you as team leader for ${wo.woNumber}: "${wo.title}"`,
    { forceSms: true },
  );

  // Direct assignee (skip if also the team leader)
  if (payload.assignedTo && payload.assignedTo !== payload.teamLeaderId) {
    add(
      payload.assignedTo,
      'wo_assigned',
      'Work Order Assigned',
      `${session.fullName ?? 'A planner'} assigned ${wo.woNumber} to you: "${wo.title}"`,
      { forceSms: true },
    );
  }

  // Team members (skip duplicates)
  if (payload.teamMembers) {
    for (const member of payload.teamMembers) {
      add(
        member.userId,
        'wo_assigned',
        'Work Order Team Assignment',
        `${session.fullName ?? 'A planner'} assigned you to the team for ${wo.woNumber}: "${wo.title}"`,
        { forceSms: true },
      );
    }
  }

  // Supervisor
  add(
    payload.assignedSupervisorId,
    'wo_assigned',
    'Work Order Pending Your Review',
    `${session.fullName ?? 'A planner'} created ${wo.woNumber} and assigned it to your team for review`,
    { forceSms: true },
  );

  return notifications;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Convert a Maintenance Request into a Work Order.
 *
 * This function encapsulates the **entire** MR→WO conversion in a single
 * database transaction, including:
 * - Idempotency checks (forward + reverse MR↔WO link)
 * - Plant-scope access validation
 * - WO number generation with P2002 retry
 * - WO creation with field defaults from the MR
 * - Team member creation (with correct access levels)
 * - Material planning (parts → WorkOrderMaterial, status 'planned')
 * - Tool planning (tools → RepairToolRequest + RepairToolRequestItem, source 'planner_suggested')
 * - MR state machine transition (approved → converted)
 * - MR workOrderId link update
 * - Audit log creation
 *
 * Notifications are **not** dispatched inside the transaction. Instead, an
 * array of notification payloads is returned for the caller to send after
 * the transaction commits.
 *
 * @param mrId    - The maintenance request primary key
 * @param payload - Conversion parameters from the frontend
 * @param session - The acting user's session (permissions assumed pre-checked)
 * @returns A result object indicating success/failure, the created WO, and any notifications
 */
export async function convertMRToWorkOrder(
  mrId: string,
  payload: ConvertMRToWOPayload,
  session: SessionLike,
): Promise<ConvertMRToWOResult> {
  const isAdmin = session.roles.includes('admin');

  // ── Phase 0: Fetch MR outside the transaction (read-only, needed for early validation) ──
  const mr = await db.maintenanceRequest.findUnique({ where: { id: mrId } });
  if (!mr) {
    return { success: false, error: 'Maintenance request not found' };
  }

  // ── Phase 1: Validate team members if provided ──
  if (payload.teamMembers && Array.isArray(payload.teamMembers)) {
    for (const member of payload.teamMembers) {
      if (!member.userId || !member.role) {
        return { success: false, error: 'Each team member must have userId and role' };
      }
    }
  }

  // ── Phase 2: Execute the entire conversion atomically ──
  try {
    const result = await db.$transaction(async (tx) => {
      // ---- 2a. Idempotency: forward link check (mr.workOrderId) ----
      if (mr.workOrderId) {
        const linkedWO = await tx.workOrder.findUnique({ where: { id: mr.workOrderId } });
        if (linkedWO) {
          return {
            success: false as const,
            error: `This request has already been converted to work order ${linkedWO.woNumber}`,
            conflictWoNumber: linkedWO.woNumber,
          };
        }
        // Stale link — will clear below
      }

      // ---- 2b. Idempotency: reverse lookup (WO → maintenanceRequestId) ----
      const existingWO = await tx.workOrder.findFirst({ where: { maintenanceRequestId: mrId } });
      if (existingWO) {
        // Repair the stale link
        await tx.maintenanceRequest.update({
          where: { id: mrId },
          data: { workOrderId: existingWO.id },
        });
        return {
          success: false as const,
          error: `This request was already converted to work order ${existingWO.woNumber}`,
          conflictWoNumber: existingWO.woNumber,
        };
      }

      // ---- 2c. Plant scope validation ----
      if (mr.plantId && !isAdmin) {
        const plantAccess = await tx.userPlant.findUnique({
          where: { userId_plantId: { userId: session.userId, plantId: mr.plantId } },
        });
        if (!plantAccess) {
          return {
            success: false as const,
            error: 'No plant access for this maintenance request',
          };
        }
      }

      // ---- 2d. Clear stale workOrderId if present ----
      if (mr.workOrderId) {
        await tx.maintenanceRequest.update({ where: { id: mrId }, data: { workOrderId: null } });
      }

      // ---- 2e. Determine WO initial status ----
      const hasAssignment = payload.assignedTo || (payload.teamMembers && payload.teamMembers.length > 0);
      const woStatus = hasAssignment ? 'assigned' : 'approved';
      const now = new Date();

      // ---- 2f. WO number generation with P2002 retry ----
      const { monthStr, baseSeq } = await determineBaseSequence(tx);
      let workOrder: Awaited<ReturnType<typeof tx.workOrder.create>>;

      const woInclude = {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        planner: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      } as const;

      let created = false;
      for (let attempt = 0; attempt < WO_NUMBER_MAX_RETRIES; attempt++) {
        const woNumber = buildWoNumber(monthStr, baseSeq + attempt);
        try {
          workOrder = await tx.workOrder.create({
            data: {
              woNumber,
              title: payload.title || mr.title,
              description: mr.description,
              type: payload.workOrderType || 'corrective',
              priority: payload.priority || mr.priority || 'medium',
              status: woStatus,
              maintenanceRequestId: mr.id,
              assetId: mr.assetId,
              departmentId: mr.departmentId,
              plantId: mr.plantId,
              estimatedHours: payload.estimatedHours ?? mr.estimatedHours ?? undefined,
              plannedStart: payload.plannedStart ? new Date(payload.plannedStart) : (mr.plannedStart ?? undefined),
              plannedEnd: payload.deliveryDateRequired
                ? new Date(payload.deliveryDateRequired)
                : (payload.plannedEnd ? new Date(payload.plannedEnd) : (mr.plannedEnd ?? undefined)),
              plannerId: session.userId,
              assignedTo: payload.assignedTo || null,
              teamLeaderId: payload.teamLeaderId || null,
              assignedSupervisorId: payload.assignedSupervisorId || null,
              assignmentType: payload.assignmentType || (payload.assignedTo ? 'direct' : null),
              assignedBy: session.userId,
              failureDescription: payload.failureDescription || null,
              causeDescription: payload.causeDescription || null,
              actionDescription: payload.actionDescription || null,
              tradeActivity: payload.tradeActivity || null,
              safetyNotes: payload.safetyNotes || null,
              ppeRequired: payload.ppeRequired || null,
              notes: payload.notes || null,
            },
            include: woInclude,
          });
          created = true;
          break;
        } catch (err: unknown) {
          if (
            err &&
            typeof err === 'object' &&
            'code' in err &&
            (err as { code: string }).code === 'P2002'
          ) {
            // Unique constraint violation on woNumber — increment and retry
            continue;
          }
          throw err; // non-P2002 error — let it propagate
        }
      }

      if (!created) {
        // All retries exhausted — look up the conflicting WO for a helpful message
        const conflictWO = await tx.workOrder.findFirst({ where: { maintenanceRequestId: mrId } });
        const woRef = conflictWO ? conflictWO.woNumber : 'an existing work order';
        return {
          success: false as const,
          error: `This request has already been converted to ${woRef}`,
          conflictWoNumber: conflictWO?.woNumber,
        };
      }

      // ---- 2h. Create team member records ----
      if (payload.teamMembers && payload.teamMembers.length > 0) {
        const teamMemberData = payload.teamMembers.map((member) => {
          const isTeamLeader = member.userId === payload.teamLeaderId;
          return {
            workOrderId: workOrder.id,
            userId: member.userId,
            role: isTeamLeader ? 'team_leader' : member.role,
            accessLevel: isTeamLeader ? 'full' : 'execution' as const,
            assignedAt: now,
          };
        });
        await tx.workOrderTeamMember.createMany({ data: teamMemberData });
      }

      // If assignedTo is not already in teamMembers, add them as well
      if (
        payload.assignedTo &&
        !(payload.teamMembers && payload.teamMembers.some((m) => m.userId === payload.assignedTo))
      ) {
        const isTeamLeader = payload.assignedTo === payload.teamLeaderId;
        await tx.workOrderTeamMember.create({
          data: {
            workOrderId: workOrder.id,
            userId: payload.assignedTo,
            role: isTeamLeader ? 'team_leader' : 'assistant',
            accessLevel: isTeamLeader ? 'full' : 'execution' as const,
            assignedAt: now,
          },
        });
      }

      // ---- 2i. Create material planning records (parts → WorkOrderMaterial) ----
      if (payload.requiredParts && Array.isArray(payload.requiredParts) && payload.requiredParts.length > 0) {
        for (const partEntry of payload.requiredParts) {
          const partId = typeof partEntry === 'object' && partEntry !== null ? partEntry.itemId : partEntry;
          const partQty = typeof partEntry === 'object' && partEntry !== null ? partEntry.quantity : 1;
          const part = await tx.inventoryItem.findUnique({ where: { id: partId } });
          if (part) {
            await tx.workOrderMaterial.create({
              data: {
                workOrderId: workOrder.id,
                itemId: part.id,
                itemName: part.name,
                quantity: partQty || 1,
                unitCost: part.unitCost || 0,
                totalCost: (partQty || 1) * (part.unitCost || 0),
                status: 'planned',
                requestedBy: session.userId,
              },
            });
          }
        }
      }

      // ---- 2j. Create tool planning records (tools → RepairToolRequest + RepairToolRequestItem) ----
      if (payload.requiredTools && Array.isArray(payload.requiredTools) && payload.requiredTools.length > 0) {
        for (const toolEntry of payload.requiredTools) {
          const toolId = typeof toolEntry === 'object' && toolEntry !== null ? toolEntry.toolId : toolEntry;
          const toolQty = typeof toolEntry === 'object' && toolEntry !== null ? toolEntry.quantity : 1;
          const tool = await tx.tool.findUnique({ where: { id: toolId } });
          if (tool) {
            // Create the tool request header
            const toolRequest = await tx.repairToolRequest.create({
              data: {
                workOrderId: workOrder.id,
                toolId: tool.id,
                toolName: tool.name,
                reason: `Planned for ${workOrder.woNumber}`,
                plantId: workOrder.plantId || undefined,
                source: 'planner_suggested',
                status: 'pending',
                requestedById: session.userId,
              },
            });

            // Create the line item
            await tx.repairToolRequestItem.create({
              data: {
                repairToolRequestId: toolRequest.id,
                toolId: tool.id,
                toolName: tool.name,
                toolCode: tool.toolCode,
                category: tool.category,
                quantityRequested: toolQty || 1,
                unitCost: tool.purchaseCost ?? undefined,
              },
            });
          }
        }
      }

      // ---- 2k. State machine transition (MR: approved → converted) ----
      const transitionResult = await executeTransition(
        'maintenance_request',
        mrId,
        'converted',
        { ...session, permissions: [] }, // executeTransition needs permissions but we assume pre-checked
        {
          extraData: {
            workOrderId: workOrder.id,
            workflowStatus: 'work_order_created',
            assignedPlannerId: session.userId,
          },
          tx,
        },
      );

      // If the transition failed, we still return the WO (it's in the tx)
      // but flag it with a warning via the notifications array
      const warnings: ConversionNotification[] = [];
      if (!transitionResult.success) {
        warnings.push({
          userId: session.userId,
          type: 'system_warning',
          title: 'MR Status Transition Warning',
          message: `Work order ${workOrder.woNumber} created but MR status transition failed: ${transitionResult.error}. The MR status may need manual update.`,
          entityType: 'work_order',
          entityId: workOrder.id,
          actionUrl: `wo-detail?id=${workOrder.id}`,
        });
      }

      // ---- 2l. Audit log ----
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'update',
          entityType: 'maintenance_request',
          entityId: mrId,
          oldValues: JSON.stringify({}),
          newValues: JSON.stringify({
            workOrderId: workOrder.id,
            woNumber: workOrder.woNumber,
            assignedTo: payload.assignedTo || null,
            teamLeaderId: payload.teamLeaderId || null,
            teamMembersCount: payload.teamMembers?.length || 0,
            assignmentType: payload.assignmentType || null,
          }),
        },
      });

      // ---- 2m. Build notification payloads ----
      const notifications: ConversionNotification[] = [];

      const requesterNotif = buildRequesterNotification(mr, workOrder, session);
      if (requesterNotif) notifications.push(requesterNotif);

      notifications.push(...buildAssignmentNotifications(payload, workOrder, session));
      notifications.push(...warnings);

      return {
        success: true as const,
        workOrder,
        notifications,
      };
    }, { timeout: 30000 });

    return result;

  } catch (error: unknown) {
    // Handle race condition: another request already converted this MR
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      const existingWO = await db.workOrder.findFirst({ where: { maintenanceRequestId: mrId } });
      const woRef = existingWO ? existingWO.woNumber : 'an existing work order';
      return {
        success: false,
        error: `This request has already been converted to ${woRef}`,
        conflictWoNumber: existingWO?.woNumber,
      };
    }

    const message = error instanceof Error ? error.message : 'Failed to convert maintenance request';
    return { success: false, error: message };
  }
}

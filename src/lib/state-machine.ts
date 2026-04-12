import { db } from '@/lib/db';

// ============================================================================
// TYPES
// ============================================================================

/** Minimal session interface matching auth.ts SessionData shape */
interface SessionLike {
  userId: string;
  roles: string[];
  permissions: string[];
}

/** Result of a transition permission check */
interface TransitionCheck {
  allowed: boolean;
  reason?: string;
  transition?: {
    fromStatus: string | null;
    toStatus: string;
    allowedRoleSlugs: string[];
    requiresReason: boolean;
  };
}

/** A single available transition for display / UI consumption */
interface AvailableTransition {
  fromStatus: string | null;
  toStatus: string;
  allowedRoleSlugs: string[];
  requiresReason: boolean;
}

/** Result of executing a status transition */
interface ExecuteResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/** Entity types that support the DB-driven state machine */
type EntityType = 'work_order' | 'maintenance_request';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse a JSON string array safely.
 * Returns an empty array on failure or non-array input.
 */
function parseRoleSlugs(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter((v) => typeof v === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Check whether the session has the admin role.
 * Admins bypass all role-based restrictions on transitions.
 */
function isAdmin(session: SessionLike): boolean {
  return session.roles.includes('admin');
}

/**
 * Determine if the session's roles intersect with the allowed role slugs.
 * Admin always passes regardless of role list.
 */
function hasAllowedRole(
  session: SessionLike,
  allowedRoleSlugs: string[],
): boolean {
  if (isAdmin(session)) return true;
  return allowedRoleSlugs.some((slug) => session.roles.includes(slug));
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if a status transition is allowed for a given user.
 *
 * Queries the `statusTransitions` table for a matching rule (entityType,
 * fromStatus, toStatus) and verifies the session's roles against the
 * `allowedRoleSlugs` JSON array.
 *
 * @param entityType  - "work_order" or "maintenance_request"
 * @param fromStatus  - Current status string, or `null` for the initial state
 * @param toStatus    - Target status to transition into
 * @param session     - The acting user's session data
 */
export async function checkTransition(
  entityType: EntityType,
  fromStatus: string | null,
  toStatus: string,
  session: SessionLike,
): Promise<TransitionCheck> {
  // Look up the matching transition rule
  const rule = await db.statusTransition.findFirst({
    where: {
      entityType,
      toStatus,
      // Prisma treats `null` fromStatus as "IS NULL" when using the object form
      fromStatus: fromStatus === null ? null : fromStatus,
    },
  });

  if (!rule) {
    return {
      allowed: false,
      reason: `No transition rule found from "${fromStatus ?? 'initial'}" to "${toStatus}" for ${entityType}.`,
    };
  }

  const allowedRoleSlugs = parseRoleSlugs(rule.allowedRoleSlugs);

  if (!hasAllowedRole(session, allowedRoleSlugs)) {
    return {
      allowed: false,
      reason: `User does not have any of the required roles (${allowedRoleSlugs.join(', ')}) to perform this transition.`,
    };
  }

  return {
    allowed: true,
    reason: undefined,
    transition: {
      fromStatus: rule.fromStatus,
      toStatus: rule.toStatus,
      allowedRoleSlugs,
      requiresReason: rule.requiresReason,
    },
  };
}

/**
 * Execute a validated status transition.
 *
 * 1. Validates via `checkTransition`.
 * 2. Updates the appropriate entity table (work_orders or maintenance_requests).
 * 3. Creates a status-history audit entry (WorkOrderStatusHistory for work orders,
 *    MaintenanceRequestComment for maintenance requests).
 * 4. Handles conversion logic when a maintenance_request moves to "converted".
 *
 * @param entityType  - "work_order" or "maintenance_request"
 * @param entityId    - The primary key of the entity to update
 * @param toStatus    - Target status
 * @param session     - The acting user's session data
 * @param options     - Optional reason and extra fields to merge into the update
 */
export async function executeTransition(
  entityType: EntityType,
  entityId: string,
  toStatus: string,
  session: SessionLike,
  options?: {
    reason?: string;
    extraData?: Record<string, unknown>;
  },
): Promise<ExecuteResult> {
  // --- 1. Determine the current status of the entity ---
  let currentStatus: string | null = null;

  if (entityType === 'work_order') {
    const wo = await db.workOrder.findUnique({
      where: { id: entityId },
      select: { status: true },
    });
    if (!wo) return { success: false, error: `Work order "${entityId}" not found.` };
    currentStatus = wo.status;
  } else {
    const mr = await db.maintenanceRequest.findUnique({
      where: { id: entityId },
      select: { status: true },
    });
    if (!mr) return { success: false, error: `Maintenance request "${entityId}" not found.` };
    currentStatus = mr.status;
  }

  // --- 2. Validate the transition ---
  const check = await checkTransition(entityType, currentStatus, toStatus, session);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  // If the transition requires a reason, ensure one was provided
  if (check.transition?.requiresReason && !options?.reason) {
    return {
      success: false,
      error: `This transition from "${currentStatus ?? 'initial'}" to "${toStatus}" requires a reason.`,
    };
  }

  // --- 3. Build the update payload (merge extraData) ---
  const updatePayload: Record<string, unknown> = {
    status: toStatus,
    ...options?.extraData,
  };

  try {
    // --- 4. Perform the update + audit trail ---
    if (entityType === 'work_order') {
      await db.$transaction(async (tx) => {
        // Update the work order
        await tx.workOrder.update({
          where: { id: entityId },
          data: updatePayload,
        });

        // Create a status history audit entry
        await tx.workOrderStatusHistory.create({
          data: {
            workOrderId: entityId,
            fromStatus: currentStatus,
            toStatus,
            performedById: session.userId,
            notes: options?.reason ?? null,
          },
        });
      });

      // Return the updated record
      const updated = await db.workOrder.findUnique({ where: { id: entityId } });
      return {
        success: true,
        data: updated as unknown as Record<string, unknown>,
      };
    }

    // --- Maintenance request path ---
    await db.$transaction(async (tx) => {
      // Handle conversion logic: when a maintenance request is being converted
      // to a work order, the maintenanceRequestId link may need updating.
      if (toStatus === 'converted') {
        // If the caller provided a workOrderId in extraData, link it
        if (options?.extraData?.workOrderId) {
          (updatePayload as Record<string, unknown>).workOrderId =
            options.extraData.workOrderId;
        }
      }

      // Update the maintenance request
      await tx.maintenanceRequest.update({
        where: { id: entityId },
        data: updatePayload,
      });

      // Create an audit comment recording the status change
      await tx.maintenanceRequestComment.create({
        data: {
          maintenanceRequestId: entityId,
          userId: session.userId,
          content: `[Status Change] ${currentStatus ?? 'initial'} → ${toStatus}${
            options?.reason ? ` | Reason: ${options.reason}` : ''
          }`,
        },
      });
    });

    // Return the updated record
    const updated = await db.maintenanceRequest.findUnique({
      where: { id: entityId },
    });
    return {
      success: true,
      data: updated as unknown as Record<string, unknown>,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Failed to execute transition: ${message}` };
  }
}

/**
 * Get all valid transitions available from a given status for a user.
 *
 * Returns every transition rule whose `fromStatus` matches `currentStatus`,
 * filtered by the user's roles (admin sees everything).
 * Results are ordered by `sortOrder` ascending.
 *
 * @param entityType     - "work_order" or "maintenance_request"
 * @param currentStatus  - The entity's current status, or `null` for initial
 * @param session        - The acting user's session data
 */
export async function getAvailableTransitions(
  entityType: EntityType,
  currentStatus: string | null,
  session: SessionLike,
): Promise<AvailableTransition[]> {
  const rules = await db.statusTransition.findMany({
    where: {
      entityType,
      fromStatus: currentStatus === null ? null : currentStatus,
    },
    orderBy: { sortOrder: 'asc' },
  });

  const admin = isAdmin(session);

  return rules
    .map((rule) => ({
      fromStatus: rule.fromStatus,
      toStatus: rule.toStatus,
      allowedRoleSlugs: parseRoleSlugs(rule.allowedRoleSlugs),
      requiresReason: rule.requiresReason,
    }))
    .filter((t) => {
      if (admin) return true;
      return t.allowedRoleSlugs.some((slug) => session.roles.includes(slug));
    });
}

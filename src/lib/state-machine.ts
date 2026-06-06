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
// DEFAULT TRANSITIONS (auto-seeded when table is empty)
// ============================================================================

const DEFAULT_MR_TRANSITIONS = [
  {
    fromStatus: null as string | null,
    toStatus: 'pending',
    allowedRoleSlugs: JSON.stringify([
      'operator', 'supervisor', 'planner', 'admin',
      'production_operator', 'plant_manager', 'maintenance_manager',
    ]),
    requiresReason: false,
  },
  {
    fromStatus: 'pending',
    toStatus: 'in_progress',
    allowedRoleSlugs: JSON.stringify([
      'supervisor', 'admin', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager',
    ]),
    requiresReason: false,
  },
  {
    fromStatus: 'pending',
    toStatus: 'approved',
    allowedRoleSlugs: JSON.stringify([
      'admin', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager',
    ]),
    requiresReason: false,
  },
  {
    fromStatus: 'pending',
    toStatus: 'rejected',
    allowedRoleSlugs: JSON.stringify([
      'admin', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager',
    ]),
    requiresReason: true,
  },
  {
    fromStatus: 'approved',
    toStatus: 'converted',
    allowedRoleSlugs: JSON.stringify([
      'planner', 'admin', 'maintenance_planner', 'maintenance_manager',
    ]),
    requiresReason: false,
  },
];

const DEFAULT_WO_TRANSITIONS = [
  { fromStatus: null as string | null, toStatus: 'draft', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'requested', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'approved', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'approved', toStatus: 'planned', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin', 'maintenance_planner', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'requested', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin', 'maintenance_planner', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'approved', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin', 'maintenance_planner', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'planned', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin', 'maintenance_planner', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'assigned', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['technician', 'admin', 'maintenance_technician', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'in_progress', toStatus: 'waiting_parts', allowedRoleSlugs: JSON.stringify(['technician', 'planner', 'admin', 'maintenance_technician', 'maintenance_planner', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'in_progress', toStatus: 'completed', allowedRoleSlugs: JSON.stringify(['technician', 'admin', 'maintenance_technician', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'waiting_parts', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['technician', 'planner', 'admin', 'maintenance_technician', 'maintenance_planner', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'completed', toStatus: 'closed', allowedRoleSlugs: JSON.stringify(['supervisor', 'planner', 'admin', 'maintenance_supervisor', 'maintenance_planner', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager']), requiresReason: true },
  { fromStatus: 'requested', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager']), requiresReason: true },
  { fromStatus: 'assigned', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin', 'maintenance_planner', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: true },
  { fromStatus: 'in_progress', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['supervisor', 'admin', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: true },
  { fromStatus: 'waiting_parts', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['supervisor', 'admin', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: true },
  { fromStatus: 'closed', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['supervisor', 'planner', 'admin', 'maintenance_supervisor', 'maintenance_planner', 'maintenance_manager']), requiresReason: true },
  { fromStatus: 'in_progress', toStatus: 'on_hold', allowedRoleSlugs: JSON.stringify(['supervisor', 'admin', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'on_hold', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['supervisor', 'admin', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: false },
];

/** Track whether seeding has been attempted this process to avoid repeated attempts */
let _seedAttempted = false;

/**
 * Ensure the status_transitions table has the required rows.
 * If the table is empty (e.g., after a fresh deploy), auto-seed it.
 * Uses upsert semantics to avoid duplicate key errors.
 * Returns true if seeded, false if already populated.
 */
async function ensureTransitionsSeeded(): Promise<boolean> {
  if (_seedAttempted) return false;

  try {
    const count = await db.statusTransition.count();
    if (count > 0) {
      _seedAttempted = true;
      return false;
    }

    console.warn('[state-machine] status_transitions table is empty — auto-seeding default transitions...');

    // Seed MR transitions
    for (let i = 0; i < DEFAULT_MR_TRANSITIONS.length; i++) {
      const t = DEFAULT_MR_TRANSITIONS[i];
      await db.statusTransition.upsert({
        where: {
          // Use a unique composite key workaround: entityType + fromStatus + toStatus
          // Since there's no unique constraint on these, we use create+catch-duplicate
          id: `auto-mr-${t.fromStatus ?? 'init'}-to-${t.toStatus}`,
        },
        update: {},
        create: {
          id: `auto-mr-${t.fromStatus ?? 'init'}-to-${t.toStatus}`,
          entityType: 'maintenance_request',
          fromStatus: t.fromStatus,
          toStatus: t.toStatus,
          allowedRoleSlugs: t.allowedRoleSlugs,
          requiresReason: t.requiresReason,
          sortOrder: i,
        },
      }).catch(() => {
        // If the ID already exists (unlikely but possible), just skip
      });
    }

    // Seed WO transitions
    for (let i = 0; i < DEFAULT_WO_TRANSITIONS.length; i++) {
      const t = DEFAULT_WO_TRANSITIONS[i];
      await db.statusTransition.upsert({
        where: {
          id: `auto-wo-${t.fromStatus ?? 'init'}-to-${t.toStatus}`,
        },
        update: {},
        create: {
          id: `auto-wo-${t.fromStatus ?? 'init'}-to-${t.toStatus}`,
          entityType: 'work_order',
          fromStatus: t.fromStatus,
          toStatus: t.toStatus,
          allowedRoleSlugs: t.allowedRoleSlugs,
          requiresReason: t.requiresReason,
          sortOrder: i,
        },
      }).catch(() => {
        // Skip on duplicate
      });
    }

    const newCount = await db.statusTransition.count();
    console.warn(`[state-machine] ✅ Auto-seeded ${newCount} default status transitions`);

    _seedAttempted = true;
    return true;
  } catch (err) {
    console.error('[state-machine] ❌ Auto-seed failed:', err);
    _seedAttempted = true; // Don't keep trying
    return false;
  }
}

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
 * If the table is empty, auto-seeds the default transitions before retrying.
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
  let rule = await db.statusTransition.findFirst({
    where: {
      entityType,
      toStatus,
      // Prisma treats `null` fromStatus as "IS NULL" when using the object form
      fromStatus: fromStatus === null ? null : fromStatus,
    },
  });

  // If no rule found, try auto-seeding the table (self-healing for fresh deploys)
  if (!rule) {
    const seeded = await ensureTransitionsSeeded();
    if (seeded) {
      // Retry the lookup after seeding
      rule = await db.statusTransition.findFirst({
        where: {
          entityType,
          toStatus,
          fromStatus: fromStatus === null ? null : fromStatus,
        },
      });
    }
  }

  if (!rule) {
    const hint = `Database table 'status_transitions' may be empty or missing the required row. ` +
      `Expected: entityType='${entityType}', fromStatus='${fromStatus ?? 'NULL'}', toStatus='${toStatus}'. ` +
      `Run: bun run scripts/seed-transitions.ts`;
    console.error(`[state-machine] No transition rule: entityType=${entityType}, from=${fromStatus ?? 'NULL'}, to=${toStatus} — ${hint}`);
    return {
      allowed: false,
      reason: `No transition rule found from "${fromStatus ?? 'initial'}" to "${toStatus}" for ${entityType}. ${hint}`,
    };
  }

  const allowedRoleSlugs = parseRoleSlugs(rule.allowedRoleSlugs);

  if (!hasAllowedRole(session, allowedRoleSlugs)) {
    console.error(`[state-machine] Role mismatch: userRoles=[${session.roles.join(',')}], required=[${allowedRoleSlugs.join(',')}], entityType=${entityType}, from=${fromStatus}, to=${toStatus}`);
    return {
      allowed: false,
      reason: `Your role (${session.roles.join(', ')}) does not allow this transition. Required roles: ${allowedRoleSlugs.join(', ')}.`,
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
 * If the table is empty, auto-seeds before returning results.
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
  // Auto-seed if table is empty
  await ensureTransitionsSeeded();

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

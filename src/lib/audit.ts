import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { randomUUID } from 'crypto';

const logger = createLogger('audit');

// ============================================================================
// AUDIT LOG — Immutable audit trail with privileged action logging
// ============================================================================

// ── Risk Levels ─────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ── Critical Action Detection Patterns ──────────────────────────────────────

const CRITICAL_ACTIONS = new Set([
  'delete',
  'remove',
  'destroy',
  'purge',
  'DROP',
]);

const CRITICAL_BULK_ACTIONS = new Set([
  'bulk_delete',
  'bulk_update',
  'bulk_create',
  'mass_delete',
  'mass_update',
]);

const CRITICAL_ROLE_ACTIONS = new Set([
  'role.create',
  'role.update',
  'role.delete',
  'role.assign',
  'role.revoke',
  'permission.grant',
  'permission.revoke',
  'permission.update',
]);

/**
 * Detect if an action is critical based on the action string and resource type.
 * Critical actions get elevated logging and may require approval.
 */
function classifyActionRisk(action: string, resourceType: string, _resourceId: string): RiskLevel {
  const normalizedAction = action.toLowerCase();

  // Role/permission changes are always high or critical
  if (CRITICAL_ROLE_ACTIONS.has(normalizedAction) || resourceType === 'Role' || resourceType === 'Permission') {
    if (normalizedAction.includes('delete') || normalizedAction.includes('revoke')) {
      return 'critical';
    }
    return 'high';
  }

  // Bulk operations
  if (CRITICAL_BULK_ACTIONS.has(normalizedAction) || normalizedAction.includes('bulk') || normalizedAction.includes('mass')) {
    return 'critical';
  }

  // Delete operations on key resources
  if (CRITICAL_ACTIONS.has(normalizedAction)) {
    if (['User', 'WorkOrder', 'Asset', 'Plant', 'Department'].includes(resourceType)) {
      return 'critical';
    }
    return 'high';
  }

  // Configuration changes
  if (resourceType === 'Setting' || resourceType === 'Config' || resourceType === 'SystemConfig') {
    return 'high';
  }

  // Status changes that are security-sensitive
  if (normalizedAction.includes('deactivate') || normalizedAction.includes('disable') || normalizedAction.includes('lock')) {
    if (resourceType === 'User') return 'critical';
    return 'high';
  }

  // Default classification
  if (normalizedAction.includes('create') || normalizedAction.includes('update') || normalizedAction.includes('approve')) {
    return 'medium';
  }

  return 'low';
}

/**
 * Determine if an action requires approval before execution.
 * Only critical actions on certain resource types require approval.
 */
function requiresApproval(riskLevel: RiskLevel, resourceType: string, action: string): boolean {
  if (riskLevel !== 'critical') return false;

  const normalizedAction = action.toLowerCase();

  // All critical actions on users, roles, and permissions require approval
  if (['User', 'Role', 'Permission'].includes(resourceType)) return true;

  // Bulk operations require approval
  if (normalizedAction.includes('bulk') || normalizedAction.includes('mass')) return true;

  return false;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Create an audit log entry.
 * Used by API routes to record write operations for compliance.
 */
export async function createAuditLog(
  userId: string,
  entityType: string,
  action: string,
  entityId?: string,
  details?: {
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        entityType,
        action,
        entityId: entityId ?? null,
        oldValues: details?.oldValues ? JSON.stringify(details.oldValues) : null,
        newValues: details?.newValues ? JSON.stringify(details.newValues) : null,
      },
    });
  } catch {
    // Audit log failures should never break the main operation
  }
}

// ── Privileged Action Logging ───────────────────────────────────────────────

interface PrivilegedActionParams {
  /** The user performing the action. */
  userId: string;
  /** The action being performed (e.g., 'delete', 'role.update'). */
  action: string;
  /** Type of resource being acted upon (e.g., 'User', 'WorkOrder'). */
  resourceType: string;
  /** ID of the specific resource instance. */
  resourceId: string;
  /** Client IP address. */
  ipAddress?: string;
  /** Client user agent. */
  userAgent?: string;
  /** State before the action (for diff tracking). */
  beforeState?: Record<string, unknown>;
  /** State after the action (for diff tracking). */
  afterState?: Record<string, unknown>;
  /** Whether the action succeeded. */
  success?: boolean;
  /** Additional context or metadata. */
  metadata?: Record<string, unknown>;
}

interface PrivilegedActionResult {
  /** Unique ID of this audit record. */
  id: string;
  /** Computed risk level. */
  riskLevel: RiskLevel;
  /** Whether this action requires approval. */
  requiresApproval: boolean;
  /** Computed state diff (changed fields only). */
  stateDiff: Record<string, { before: unknown; after: unknown }> | null;
}

/**
 * Log a privileged action with full context.
 *
 * This is the primary method for logging security-sensitive operations:
 * - Deletes, bulk operations, role/permission changes
 * - Computes risk level automatically
 * - Records before/after state diff
 * - Persists to the AuditLog table with PRIVILEGED: prefix
 *
 * The audit trail is IMMUTABLE — no delete or update operations
 * are exposed for audit log entries.
 *
 * @returns The audit result with computed metadata.
 */
export async function logPrivilegedAction(params: PrivilegedActionParams): Promise<PrivilegedActionResult> {
  const {
    userId,
    action,
    resourceType,
    resourceId,
    ipAddress = 'unknown',
    userAgent = 'unknown',
    beforeState,
    afterState,
    success = true,
    metadata = {},
  } = params;

  const id = `priv-${Date.now()}-${randomUUID().slice(0, 8)}`;

  // Classify risk level
  const riskLevel = classifyActionRisk(action, resourceType, resourceId);
  const needsApproval = requiresApproval(riskLevel, resourceType, action);

  // Compute state diff
  const stateDiff = computeStateDiff(beforeState, afterState);

  // Build the full audit record
  const auditData = {
    _privilegedActionId: id,
    _riskLevel: riskLevel,
    _requiresApproval: needsApproval,
    _ipAddress: ipAddress,
    _userAgent: userAgent,
    _stateDiff: stateDiff,
    success,
    ...metadata,
  };

  // Persist to database
  try {
    await db.auditLog.create({
      data: {
        userId,
        entityType: `PRIVILEGED:${resourceType}`,
        action: `PRIVILEGED:${action}`,
        entityId: resourceId,
        oldValues: beforeState ? JSON.stringify(beforeState) : null,
        newValues: afterState ? JSON.stringify(afterState) : null,
        // Store enriched data in newValues alongside afterState
        // We use the main newValues field for the privileged action metadata
      },
    });

    // Also create a separate detailed record for privileged actions
    await db.auditLog.create({
      data: {
        userId,
        entityType: resourceType,
        action: `PRIVILEGED_META:${action}`,
        entityId: resourceId,
        newValues: JSON.stringify(auditData),
      },
    });
  } catch (err) {
    logger.error('Failed to persist privileged action audit', {
      error: err instanceof Error ? err.message : String(err),
      privilegedActionId: id,
    });
    // Do NOT throw — audit failures must never break the main operation
  }

  // Log based on risk level
  const logData = {
    privilegedActionId: id,
    userId,
    action,
    resourceType,
    resourceId,
    riskLevel,
    requiresApproval: needsApproval,
    ipAddress,
    success,
  };

  if (riskLevel === 'critical') {
    logger.error('CRITICAL privileged action', logData);
  } else if (riskLevel === 'high') {
    logger.warn('HIGH risk privileged action', logData);
  } else {
    logger.info('Privileged action logged', logData);
  }

  return {
    id,
    riskLevel,
    requiresApproval: needsApproval,
    stateDiff,
  };
}

// ── Immutable Audit Trail Enforcement ───────────────────────────────────────

/**
 * Query audit logs (read-only). No update/delete operations are exposed.
 * This ensures the audit trail remains immutable.
 */
export async function queryAuditLogs(params: {
  userId?: string;
  entityType?: string;
  action?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const {
    userId,
    entityType,
    action,
    entityId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = params;

  const where: Record<string, unknown> = {};

  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;
  if (action) where.action = { contains: action };
  if (entityId) where.entityId = entityId;
  if (startDate || endDate) {
    const createdAt: Record<string, unknown> = {};
    if (startDate) createdAt.gte = startDate;
    if (endDate) createdAt.lte = endDate;
    where.createdAt = createdAt;
  }

  try {
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
        select: {
          id: true,
          userId: true,
          entityType: true,
          action: true,
          entityId: true,
          oldValues: true,
          newValues: true,
          createdAt: true,
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  } catch (err) {
    logger.error('Failed to query audit logs', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { logs: [], total: 0, limit, offset };
  }
}

// ── State Diff Computation ──────────────────────────────────────────────────

/**
 * Compute a diff between before and after states.
 * Only includes fields that have changed.
 * Handles nested objects one level deep.
 */
function computeStateDiff(
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> | null {
  if (!before && !after) return null;
  if (!before) return null; // Creation — no "before" state to diff
  if (!after) return null;  // Deletion — no "after" state

  const diff: Record<string, { before: unknown; after: unknown }> = {};

  // Collect all keys from both states
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeVal = before[key];
    const afterVal = after[key];

    // Skip if values are identical
    if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) continue;

    diff[key] = { before: beforeVal, after: afterVal };
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

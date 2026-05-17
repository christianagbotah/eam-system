import { db } from '@/lib/db';

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

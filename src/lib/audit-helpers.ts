import { NextRequest } from 'next/server';

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  plantId?: string;
  departmentId?: string;
}

/**
 * Extract audit context from a NextRequest.
 * Reads IP, User-Agent, and session cookie.
 */
export function extractAuditContext(request: NextRequest, additional?: { plantId?: string; departmentId?: string }): AuditContext {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Try to extract session ID from the session cookie
  let sessionId: string | undefined;
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/session_id=([^;]+)/);
    if (match) sessionId = match[1];
  }

  return {
    ipAddress,
    userAgent,
    sessionId,
    plantId: additional?.plantId,
    departmentId: additional?.departmentId,
  };
}

/**
 * Create an audit log entry with full context.
 * Drop-in replacement for direct db.auditLog.create calls.
 */
export function buildAuditData(
  action: string,
  entityType: string,
  entityId: string,
  userId: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  context?: AuditContext,
) {
  return {
    userId,
    action,
    entityType,
    entityId,
    oldValues: oldValues ? JSON.stringify(oldValues) : null,
    newValues: newValues ? JSON.stringify(newValues) : null,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
    sessionId: context?.sessionId,
    plantId: context?.plantId,
    departmentId: context?.departmentId,
  };
}

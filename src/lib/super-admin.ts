import { db } from '@/lib/db';
import type { SessionData } from '@/lib/auth';

/**
 * Vendor/Super Admin authority is intentionally database-backed rather than
 * session-embedded. This makes privilege revocation effective immediately and
 * reuses the existing User.isVendorAdmin flag instead of introducing another
 * competing administrator role/flag.
 */
export async function isSuperAdmin(session: SessionData): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { isVendorAdmin: true, status: true },
  });

  return Boolean(user?.isVendorAdmin && user.status === 'active');
}

export async function requireSuperAdmin(session: SessionData): Promise<void> {
  if (!(await isSuperAdmin(session))) {
    throw new SuperAdminRequiredError();
  }
}

export class SuperAdminRequiredError extends Error {
  readonly status = 403;
  readonly code = 'SUPER_ADMIN_REQUIRED';

  constructor() {
    super('Super Admin authorization is required for this operation');
    this.name = 'SuperAdminRequiredError';
  }
}

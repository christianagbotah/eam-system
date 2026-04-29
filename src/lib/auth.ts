import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// ============================================================================
// SESSION MANAGEMENT — DB-backed with in-memory LRU cache
// ============================================================================

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for fast token lookups (avoids DB query on every API call)
const globalForSessions = globalThis as unknown as {
  sessionCache: Map<string, { data: SessionData; cachedAt: number }> | undefined;
};

if (!globalForSessions.sessionCache) {
  globalForSessions.sessionCache = new Map();
}
export const sessionCache = globalForSessions.sessionCache;

// Maximum cache entries before cleanup
const MAX_CACHE_SIZE = 500;
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface SessionData {
  userId: string;
  username: string;
  roles: string[];       // role slugs
  permissions: string[]; // permission slugs
  createdAt: Date;
}

// Generate a simple auth token (UUID-based)
export function generateToken(): string {
  return randomUUID();
}

// Create a session after successful login — persists to DB + caches in memory
export async function createSession(userId: string): Promise<{ token: string; session: SessionData }> {
  // Fetch user with roles, permissions, and plant access
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
      directPerms: {
        include: { permission: true },
      },
    },
  });

  if (!user) throw new Error('User not found');

  // Collect role-based permissions
  const roleSlugsSet = new Set<string>();
  const permissionSlugsSet = new Set<string>();

  for (const ur of (user.userRoles || [])) {
    roleSlugsSet.add(ur.role.slug);
    for (const rp of (ur.role.rolePermissions || [])) {
      permissionSlugsSet.add(rp.permission.slug);
    }
  }

  // Apply direct permission overrides
  for (const up of (user.directPerms || [])) {
    // Check expiry first
    if (up.expiresAt && new Date(up.expiresAt) < new Date()) {
      permissionSlugsSet.delete(up.permission.slug);
      continue;
    }
    if (up.isGranted) {
      permissionSlugsSet.add(up.permission.slug);
    } else {
      permissionSlugsSet.delete(up.permission.slug);
    }
  }

  // Admin role gets ALL permissions
  if (roleSlugsSet.has('admin')) {
    const allPermissions = await db.permission.findMany({ select: { slug: true } });
    for (const p of allPermissions) {
      permissionSlugsSet.add(p.slug);
    }
  }

  const uniquePermissions = [...permissionSlugsSet];
  const uniqueRoles = [...roleSlugsSet];

  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  const sessionData: SessionData = {
    userId: user.id,
    username: user.username,
    roles: uniqueRoles,
    permissions: uniquePermissions,
    createdAt: now,
  };

  // Persist to database
  await db.session.create({
    data: {
      token,
      userId: user.id,
      roles: JSON.stringify(uniqueRoles),
      permissions: JSON.stringify(uniquePermissions),
      expiresAt,
    },
  });

  // Cache in memory
  sessionCache.set(token, { data: sessionData, cachedAt: Date.now() });

  // Cleanup expired DB sessions (non-blocking, best-effort)
  cleanupExpiredSessions().catch(() => {});

  return { token, session: sessionData };
}

// Get session from request (Bearer token in Authorization header)
// Checks in-memory cache first, falls back to DB lookup
export function getSession(request: Request): SessionData | null {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  // 1. Check in-memory cache first (fast path)
  const cached = sessionCache.get(token);
  if (cached) {
    // Verify not expired
    const age = Date.now() - cached.cachedAt;
    if (age > SESSION_TTL_MS) {
      sessionCache.delete(token);
      return null;
    }
    return cached.data;
  }

  // 2. Fallback: synchronous return null (DB lookup is async, handled by middleware)
  // The middleware already validated the token, so route handlers can rely on getSession
  // returning the cached data. If cache is cold, the middleware populates it.
  return null;
}

// Get session from token directly (async, used by middleware)
export async function getSessionAsync(token: string): Promise<SessionData | null> {
  // 1. Check in-memory cache
  const cached = sessionCache.get(token);
  if (cached) {
    const age = Date.now() - cached.cachedAt;
    if (age > SESSION_TTL_MS) {
      sessionCache.delete(token);
      return null;
    }
    // Update lastSeen in DB (fire-and-forget)
    updateLastSeen(token).catch(() => {});
    return cached.data;
  }

  // 2. Look up in database
  const dbSession = await db.session.findUnique({
    where: { token },
  });

  if (!dbSession) return null;

  // Check expiry
  if (new Date(dbSession.expiresAt) < new Date()) {
    await db.session.delete({ where: { id: dbSession.id } }).catch(() => {});
    return null;
  }

  // Parse JSON fields
  let roles: string[] = [];
  let permissions: string[] = [];
  try {
    roles = JSON.parse(dbSession.roles);
    permissions = JSON.parse(dbSession.permissions);
  } catch {
    return null;
  }

  const sessionData: SessionData = {
    userId: dbSession.userId,
    username: '', // Not stored in DB session; look up from user if needed
    roles,
    permissions,
    createdAt: dbSession.createdAt,
  };

  // Populate cache
  sessionCache.set(token, { data: sessionData, cachedAt: Date.now() });

  // Evict old entries if cache is too large
  if (sessionCache.size > MAX_CACHE_SIZE) {
    const entries = [...sessionCache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    for (let i = 0; i < entries.length / 2; i++) {
      sessionCache.delete(entries[i][0]);
    }
  }

  // Update lastSeen (fire-and-forget)
  updateLastSeen(token).catch(() => {});

  return sessionData;
}

// Delete session (logout)
export async function deleteSession(token: string): Promise<void> {
  // Remove from cache
  sessionCache.delete(token);

  // Remove from database
  try {
    await db.session.deleteMany({ where: { token } });
  } catch {
    // Silently fail — cache is already cleared
  }
}

// Cleanup expired sessions from DB (runs periodically)
async function cleanupExpiredSessions(): Promise<void> {
  try {
    const result = await db.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    // Silently cleaned up expired sessions
  } catch {
    // Silently fail
  }
}

// Update lastSeen timestamp (fire-and-forget)
async function updateLastSeen(token: string): Promise<void> {
  try {
    await db.session.update({
      where: { token },
      data: { lastSeen: new Date() },
    });
  } catch {
    // Silently fail
  }
}

// Check if user has a specific permission
export function hasPermission(session: SessionData, permissionSlug: string): boolean {
  return session.permissions.includes(permissionSlug);
}

// Check if user has any of the given permissions
export function hasAnyPermission(session: SessionData, permissionSlugs: string[]): boolean {
  return permissionSlugs.some((s) => session.permissions.includes(s));
}

// Check if user has a specific role
export function hasRole(session: SessionData, roleSlug: string): boolean {
  return session.roles.includes(roleSlug);
}

// Check if user is admin
export function isAdmin(session: SessionData): boolean {
  return session.roles.includes('admin');
}

// Get primary plant for user
export async function getUserPlantId(userId: string): Promise<string | null> {
  const userPlant = await db.userPlant.findFirst({
    where: { userId, isPrimary: true },
  });
  return userPlant?.plantId ?? null;
}

// Populate session cache on server startup (warm cache from DB)
export async function warmSessionCache(): Promise<void> {
  try {
    const activeSessions = await db.session.findMany({
      where: { expiresAt: { gt: new Date() } },
    });

    for (const s of activeSessions) {
      let roles: string[] = [];
      let permissions: string[] = [];
      try {
        roles = JSON.parse(s.roles);
        permissions = JSON.parse(s.permissions);
      } catch {
        continue;
      }

      sessionCache.set(s.token, {
        data: {
          userId: s.userId,
          username: '',
          roles,
          permissions,
          createdAt: s.createdAt,
        },
        cachedAt: Date.now(),
      });
    }

    // Session cache warmed successfully
  } catch {
    // Silently fail — DB may not be ready during cold start
  }
}

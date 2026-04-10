import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// In-memory session store (for prototype; use Redis/DB for production)
const sessions = new Map<string, SessionData>();

interface SessionData {
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

// Create a session after successful login
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
      plantAccess: {
        include: { plant: true },
      },
    },
  });

  if (!user) throw new Error('User not found');

  // Collect role-based permissions
  const roleSlugs: string[] = [];
  const permissionSlugs: string[] = new Set<string>() as unknown as string[];

  for (const ur of user.userRoles) {
    roleSlugs.push(ur.role.slug);
    for (const rp of ur.role.rolePermissions) {
      permissionSlugs.push(rp.permission.slug);
    }
  }

  // Apply direct permission overrides
  for (const up of user.directPerms) {
    if (up.isGranted) {
      if (!permissionSlugs.includes(up.permission.slug)) {
        permissionSlugs.push(up.permission.slug);
      }
    } else {
      // Remove denied permission
      const idx = permissionSlugs.indexOf(up.permission.slug);
      if (idx > -1) {
        permissionSlugs.splice(idx, 1);
      }
    }
    // Check expiry
    if (up.expiresAt && new Date(up.expiresAt) < new Date()) {
      const idx = permissionSlugs.indexOf(up.permission.slug);
      if (idx > -1) {
        permissionSlugs.splice(idx, 1);
      }
    }
  }

  // Admin role gets ALL permissions
  if (roleSlugs.includes('admin')) {
    const allPermissions = await db.permission.findMany({ select: { slug: true } });
    const allSlugs = allPermissions.map((p) => p.slug);
    // Replace with all permissions
    permissionSlugs.length = 0;
    for (const s of allSlugs) {
      permissionSlugs.push(s);
    }
  }

  const uniquePermissions = [...new Set(permissionSlugs)];
  const uniqueRoles = [...new Set(roleSlugs)];

  const token = randomUUID();
  const session: SessionData = {
    userId: user.id,
    username: user.username,
    roles: uniqueRoles,
    permissions: uniquePermissions,
    createdAt: new Date(),
  };

  sessions.set(token, session);
  return { token, session };
}

// Get session from request (Bearer token in Authorization header)
export function getSession(request: Request): SessionData | null {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;

  // Check expiry (24 hours)
  const created = new Date(session.createdAt).getTime();
  if (Date.now() - created > 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    return null;
  }

  return session;
}

// Delete session
export function deleteSession(token: string): void {
  sessions.delete(token);
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

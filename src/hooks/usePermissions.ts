'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';

// --- localStorage keys (must match authStore) ---
const LS_PERMISSIONS = 'user_permissions';
const LS_ROLES = 'user_roles';

/** Safely parse JSON from localStorage */
function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface UsePermissionsReturn {
  permissions: string[];
  roles: string[];
  hasPermission: (slug: string) => boolean;
  hasAnyPermission: (slugs: string[]) => boolean;
  hasAllPermissions: (slugs: string[]) => boolean;
  hasRole: (slug: string) => boolean;
  hasAnyRole: (slugs: string[]) => boolean;
  isAdmin: boolean;
  /** Shorthand: can('work_orders', 'view') → checks 'work_orders.view' */
  can: (module: string, action: string) => boolean;
  isLoading: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  // Subscribe to the Zustand store for real-time updates within the same tab
  const storePermissions = useAuthStore((s) => s.permissions);
  const storeUser = useAuthStore((s) => s.user);

  // Hydrate from localStorage immediately (no flash, no useEffect needed)
  const [initialPerms] = useState(() => readLS<string[]>(LS_PERMISSIONS, []));
  const [initialRoles] = useState(() => readLS<string[]>(LS_ROLES, []));

  // Local overrides only for multi-tab sync via storage events
  const [lsPermissions, setLsPermissions] = useState<string[] | null>(null);
  const [lsRoles, setLsRoles] = useState<string[] | null>(null);

  // Multi-tab sync: when another tab updates localStorage, re-read
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === LS_PERMISSIONS) {
        setLsPermissions(readLS<string[]>(LS_PERMISSIONS, []));
      } else if (e.key === LS_ROLES) {
        setLsRoles(readLS<string[]>(LS_ROLES, []));
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Derive effective values: prefer Zustand store (same-tab source of truth),
  // fall back to localStorage for cross-tab reads or initial hydration.
  const permissions = storePermissions.length > 0
    ? storePermissions
    : (lsPermissions ?? initialPerms);

  const roles = storeUser?.roles?.length
    ? storeUser.roles.map((r) => r.slug)
    : (lsRoles ?? initialRoles);

  // isLoading is false — localStorage reads are synchronous via useState initializer
  const isLoading = false;

  // --- Permission checks ---
  const hasPermission = useCallback(
    (slug: string) => permissions.includes(slug),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (slugs: string[]) => slugs.some((s) => permissions.includes(s)),
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (slugs: string[]) => slugs.every((s) => permissions.includes(s)),
    [permissions]
  );

  const hasRole = useCallback(
    (slug: string) => roles.includes(slug),
    [roles]
  );

  const hasAnyRole = useCallback(
    (slugs: string[]) => slugs.some((s) => roles.includes(s)),
    [roles]
  );

  const can = useCallback(
    (module: string, action: string) => permissions.includes(`${module}.${action}`),
    [permissions]
  );

  const isAdmin = useMemo(
    () => roles.includes('admin') || roles.includes('super_admin'),
    [roles]
  );

  return {
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isAdmin,
    can,
    isLoading,
  };
}

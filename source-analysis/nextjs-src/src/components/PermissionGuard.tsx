'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export default function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  redirectTo
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();
  const router = useRouter();

  const permissionList = permission ? [permission] : permissions;
  
  const hasAccess = requireAll
    ? hasAllPermissions(permissionList)
    : hasAnyPermission(permissionList);

  useEffect(() => {
    if (!loading && !hasAccess && redirectTo) {
      router.push(redirectTo);
    }
  }, [loading, hasAccess, redirectTo, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  return <>{children}</>;
}

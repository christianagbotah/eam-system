'use client';

import { usePermissions } from '@/hooks/usePermissions';

interface PermissionSectionProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requiredRole?: string;
  requiredRoles?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export default function PermissionSection({
  children,
  requiredPermission,
  requiredPermissions = [],
  requiredRole,
  requiredRoles = [],
  requireAll = false,
  fallback = null
}: PermissionSectionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, userRole } = usePermissions();

  let hasAccess = true;

  if (requiredRole && userRole !== requiredRole) {
    hasAccess = false;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
    hasAccess = false;
  }

  const allPermissions = [
    ...(requiredPermission ? [requiredPermission] : []),
    ...requiredPermissions
  ];

  if (allPermissions.length > 0) {
    if (requireAll) {
      hasAccess = hasAccess && hasAllPermissions(allPermissions);
    } else {
      hasAccess = hasAccess && hasAnyPermission(allPermissions);
    }
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

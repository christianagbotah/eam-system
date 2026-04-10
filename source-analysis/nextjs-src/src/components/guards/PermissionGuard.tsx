'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requiredRole?: string;
  requiredRoles?: string[];
  requireAll?: boolean;
  fallbackUrl?: string;
  showUnauthorized?: boolean;
}

export default function PermissionGuard({
  children,
  requiredPermission,
  requiredPermissions = [],
  requiredRole,
  requiredRoles = [],
  requireAll = false,
  fallbackUrl = '/unauthorized',
  showUnauthorized = false
}: PermissionGuardProps) {
  const router = useRouter();
  const { hasPermission, hasAnyPermission, hasAllPermissions, userRole, loading } = usePermissions();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

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

    setAuthorized(hasAccess);

    if (!hasAccess && !showUnauthorized) {
      router.replace(fallbackUrl);
    }
  }, [loading, userRole, requiredRole, requiredRoles, requiredPermission, requiredPermissions, requireAll, router, fallbackUrl, showUnauthorized, hasPermission, hasAnyPermission, hasAllPermissions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authorized && showUnauthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this resource.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}

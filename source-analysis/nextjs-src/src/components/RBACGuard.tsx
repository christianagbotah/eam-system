'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { canAccessModule, hasPermission } from '@/lib/rbac';

interface RBACGuardProps {
  module: string;
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RBACGuard({ module, action = 'view', children, fallback }: RBACGuardProps) {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user role from session/localStorage
    const userStr = localStorage.getItem('user');
    let userRole = 'technician';
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userRole = user.role || 'technician';
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    
    // Check access
    const canAccess = hasPermission(userRole, module, action);
    setHasAccess(canAccess);
    setLoading(false);

    // Redirect if no access
    if (!canAccess) {
      setTimeout(() => router.push('/unauthorized'), 1000);
    }
  }, [module, action, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this module.</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

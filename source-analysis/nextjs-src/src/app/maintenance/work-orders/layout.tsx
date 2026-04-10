'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedLayout from '@/components/ProtectedLayout';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { checkAuth } from '@/middleware/auth';

export default function WorkOrdersLayout({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const auth = checkAuth();
    
    if (!auth) {
      router.replace('/login');
      return;
    }
    
    const role = auth.user?.role || '';
    setUserRole(role);
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedLayout allowedRoles={['admin', 'manager', 'supervisor', 'planner', 'technician']}>
      <DashboardLayout role={userRole}>{children}</DashboardLayout>
    </ProtectedLayout>
  );
}

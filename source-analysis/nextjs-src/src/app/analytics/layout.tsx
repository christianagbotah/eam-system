'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ProtectedLayout from '@/components/ProtectedLayout';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        router.push('/login');
        return;
      }

      const userData = JSON.parse(user);
      setUserRole(userData.role || '');
    };

    checkAuth();
  }, [router]);

  if (!userRole) {
    return <div>Loading...</div>;
  }

  return (
    <ProtectedLayout allowedRoles={['admin', 'manager', 'supervisor', 'planner']}>
      <DashboardLayout userRole={userRole}>
        {children}
      </DashboardLayout>
    </ProtectedLayout>
  );
}

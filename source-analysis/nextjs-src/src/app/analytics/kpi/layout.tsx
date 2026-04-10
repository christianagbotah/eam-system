'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function KPILayout({ children }: { children: React.ReactNode }) {
  const { hasPermission, loading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !hasPermission('analytics.view')) {
      router.push('/unauthorized');
    }
  }, [hasPermission, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!hasPermission('analytics.view')) return null;

  return <DashboardLayout>{children}</DashboardLayout>;
}

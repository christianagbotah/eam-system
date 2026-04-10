'use client';

import { usePermissions } from '@/hooks/usePermissions';
import DashboardLayout from '@/components/DashboardLayout';

export default function IoTMonitoringLayout({ children }: { children: React.ReactNode }) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!hasPermission('iot.view')) {
    return <div className="p-6 text-center"><p className="text-red-600">Access denied. Required permission: iot.view</p></div>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
